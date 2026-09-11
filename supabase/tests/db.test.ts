// Roda as migrations num Postgres em memória (PGlite) imitando o Supabase
// (papéis anon/authenticated, auth.uid() e permissões padrão) e confere regras e segurança.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..')
const sql = (file: string) => readFileSync(join(root, file), 'utf8')

const ADMIN = '00000000-0000-4000-8000-00000000a001'
const CUSTOMER_USER = '00000000-0000-4000-8000-00000000b001'
const P_BRINCO = '10000000-0000-4000-8000-000000000001'
const P_COLAR = '10000000-0000-4000-8000-000000000002'
const P_PULSEIRA = '10000000-0000-4000-8000-000000000003'
const P_INATIVO = '10000000-0000-4000-8000-000000000004'

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`

let db: PGlite

type Role = 'anon' | 'authenticated'

async function as<T>(role: Role, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ''])
  await db.exec(`set role ${role}`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

async function createOrder(phone: string, items: Array<Record<string, unknown>>, name = 'Maria Silva') {
  const { rows } = await db.query<{ r: Record<string, unknown> }>(
    'select public.create_order($1, $2, $3::jsonb) as r',
    [name, phone, JSON.stringify(items)],
  )
  return rows[0].r
}

async function stockOf(id: string) {
  const { rows } = await db.query<{ stock: number | null }>('select stock from public.products where id = $1', [id])
  return rows[0].stock
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const file of ['0001_schema.sql', '0002_rls.sql', '0003_functions.sql']) {
    await db.exec(sql(`migrations/${file}`))
  }
  await db.exec(sql('seed.sql'))
  await db.exec(`
    insert into auth.users (id) values ('${ADMIN}'), ('${CUSTOMER_USER}');
    insert into public.admins (user_id) values ('${ADMIN}');
    insert into public.products (id, category_id, name, slug, code, price_cents, stock, active)
    select v.id::uuid, c.id, v.name, v.slug, v.code, v.price, v.stock, v.active
    from (values
      ('${P_BRINCO}', 'brincos', 'Brinco argola', 'brinco-argola', 'BR-101', 2490, null::integer, true),
      ('${P_COLAR}', 'colares', 'Colar riviera', 'colar-riviera', 'CL-101', 7990, 10, true),
      ('${P_PULSEIRA}', 'pulseiras', 'Pulseira elos', 'pulseira-elos', 'PL-101', 2990, 2, true),
      ('${P_INATIVO}', 'aneis', 'Anel fora de linha', 'anel-fora-de-linha', 'AN-101', 1990, null::integer, false)
    ) as v (id, cat, name, slug, code, price, stock, active)
    join public.categories c on c.slug = v.cat;
  `)
})

describe('catálogo público', () => {
  it('visitante vê só produtos ativos', async () => {
    const rows = await as('anon', null, async () => (await db.query('select code from public.products order by code')).rows)
    expect(rows.map((r) => (r as { code: string }).code)).toEqual(['BR-101', 'CL-101', 'PL-101'])
  })

  it('visitante lê as configurações da loja', async () => {
    const rows = await as('anon', null, async () => (await db.query('select whatsapp_number, min_order_cents from public.settings')).rows)
    expect(rows[0]).toEqual({ whatsapp_number: '5551992275944', min_order_cents: 49000 })
  })

  it('visitante não altera produtos', async () => {
    await as('anon', null, () => db.query(`update public.products set price_cents = 1 where id = '${P_BRINCO}'`))
    expect((await db.query<{ price_cents: number }>(`select price_cents from public.products where id = '${P_BRINCO}'`)).rows[0].price_cents).toBe(2490)
  })
})

describe('create_order', () => {
  it('recusa pedido abaixo de R$ 490', async () => {
    await expect(as('anon', null, () => createOrder('51999990001', [{ product_id: P_BRINCO, quantity: 2 }]))).rejects.toThrow(
      /below_minimum/,
    )
  })

  it('calcula o total pelo preço do banco, ignorando preço enviado pelo site', async () => {
    const r = await as('anon', null, () =>
      createOrder('(51) 99999-0002', [
        { product_id: P_BRINCO, quantity: 12, price_cents: 1 },
        { product_id: P_COLAR, quantity: 3 },
      ]),
    )
    expect(r.order_number).toMatch(/^GLM-\d{8}-\d{3}$/)
    expect(r.total_cents).toBe(12 * 2490 + 3 * 7990)
    expect(r.item_count).toBe(15)
    expect(r.customer_phone).toBe('51999990002')
    expect((r.items as unknown[]).length).toBe(2)
  })

  it('numera os pedidos do dia em sequência', async () => {
    const a = await as('anon', null, () => createOrder('51999990003', [{ product_id: P_BRINCO, quantity: 20 }]))
    const b = await as('anon', null, () => createOrder('51999990004', [{ product_id: P_BRINCO, quantity: 20 }]))
    const seq = (n: unknown) => Number(String(n).slice(-3))
    expect(seq(b.order_number)).toBe(seq(a.order_number) + 1)
  })

  it('respeita o estoque', async () => {
    await expect(
      as('anon', null, () =>
        createOrder('51999990005', [
          { product_id: P_BRINCO, quantity: 20 },
          { product_id: P_PULSEIRA, quantity: 3 },
        ]),
      ),
    ).rejects.toThrow(/insufficient_stock/)
  })

  it('recusa produto inativo', async () => {
    await expect(
      as('anon', null, () =>
        createOrder('51999990006', [
          { product_id: P_BRINCO, quantity: 20 },
          { product_id: P_INATIVO, quantity: 1 },
        ]),
      ),
    ).rejects.toThrow(/product_unavailable/)
  })

  it('recusa telefone inválido', async () => {
    await expect(as('anon', null, () => createOrder('9999', [{ product_id: P_BRINCO, quantity: 20 }]))).rejects.toThrow(
      /invalid_phone/,
    )
  })

  it('limita a 5 pedidos por telefone por hora', async () => {
    for (let i = 0; i < 5; i++) {
      await as('anon', null, () => createOrder('51988887777', [{ product_id: P_BRINCO, quantity: 20 }]))
    }
    await expect(as('anon', null, () => createOrder('51988887777', [{ product_id: P_BRINCO, quantity: 20 }]))).rejects.toThrow(
      /rate_limited/,
    )
  })
})

describe('pedidos protegidos', () => {
  it('visitante não grava pedido direto na tabela', async () => {
    await expect(
      as('anon', null, () =>
        db.query(
          `insert into public.orders (order_number, customer_name, customer_phone, total_cents, item_count)
           values ('X', 'Hacker', '51999999999', 1, 1)`,
        ),
      ),
    ).rejects.toThrow(/permission denied/)
  })

  it('visitante não lê pedidos', async () => {
    const rows = await as('anon', null, async () => (await db.query('select * from public.orders')).rows)
    expect(rows).toHaveLength(0)
  })

  it('usuário logado que não é admin também não lê pedidos', async () => {
    const rows = await as('authenticated', CUSTOMER_USER, async () => (await db.query('select * from public.orders')).rows)
    expect(rows).toHaveLength(0)
  })

  it('admin lê pedidos', async () => {
    const rows = await as('authenticated', ADMIN, async () => (await db.query('select * from public.orders')).rows)
    expect(rows.length).toBeGreaterThan(0)
  })
})

describe('set_order_status', () => {
  it('só admin muda status', async () => {
    const r = await as('anon', null, () => createOrder('51999990010', [{ product_id: P_BRINCO, quantity: 20 }]))
    const { rows } = await db.query<{ id: string }>('select id from public.orders where order_number = $1', [r.order_number])
    const id = rows[0].id
    await expect(as('anon', null, () => db.query(`select public.set_order_status('${id}', 'confirmado')`))).rejects.toThrow(
      /permission denied/,
    )
    await expect(
      as('authenticated', CUSTOMER_USER, () => db.query(`select public.set_order_status('${id}', 'confirmado')`)),
    ).rejects.toThrow(/not_admin/)
  })

  it('confirmar baixa o estoque uma vez e cancelar devolve', async () => {
    const r = await as('anon', null, () =>
      createOrder('51999990011', [
        { product_id: P_COLAR, quantity: 4 },
        { product_id: P_BRINCO, quantity: 10 },
      ]),
    )
    const { rows } = await db.query<{ id: string }>('select id from public.orders where order_number = $1', [r.order_number])
    const id = rows[0].id
    const setStatus = (status: string) =>
      as('authenticated', ADMIN, () => db.query(`select public.set_order_status('${id}', '${status}')`))

    expect(await stockOf(P_COLAR)).toBe(10)
    await setStatus('confirmado')
    expect(await stockOf(P_COLAR)).toBe(6)
    await setStatus('pronto')
    expect(await stockOf(P_COLAR)).toBe(6)
    await setStatus('cancelado')
    expect(await stockOf(P_COLAR)).toBe(10)
    expect(await stockOf(P_BRINCO)).toBeNull()
  })

  it('admin não muda status direto na tabela, só pela função', async () => {
    await expect(
      as('authenticated', ADMIN, () => db.query(`update public.orders set status = 'retirado'`)),
    ).rejects.toThrow(/permission denied/)
    await as('authenticated', ADMIN, () => db.query(`update public.orders set admin_notes = 'ligar amanhã'`))
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.orders where admin_notes = 'ligar amanhã'`)
    expect(rows[0].n).toBeGreaterThan(0)
  })
})

describe('painel', () => {
  it('admin_dashboard devolve os números e é só para admin', async () => {
    const { rows } = await as('authenticated', ADMIN, () =>
      db.query<{ r: Record<string, unknown> }>(
        `select public.admin_dashboard(now() - interval '30 days', now() + interval '1 minute') as r`,
      ),
    )
    expect(Number(rows[0].r.orders_count)).toBeGreaterThan(0)
    expect(Array.isArray(rows[0].r.top_sold)).toBe(true)
    await expect(
      as('anon', null, () => db.query(`select public.admin_dashboard(now() - interval '1 day', now())`)),
    ).rejects.toThrow(/permission denied/)
  })

  it('sugere o próximo código da categoria', async () => {
    const { rows } = await as('authenticated', ADMIN, () =>
      db.query<{ code: string }>(
        `select public.next_product_code((select id from public.categories where slug = 'brincos')) as code`,
      ),
    )
    expect(rows[0].code).toBe('BR-102')
  })
})

describe('eventos', () => {
  it('visitante registra evento mas não lê', async () => {
    await as('anon', null, () =>
      db.query(`insert into public.events (type, product_id, session_id) values ('add_to_cart', '${P_BRINCO}', 's1')`),
    )
    const rows = await as('anon', null, async () => (await db.query('select * from public.events')).rows)
    expect(rows).toHaveLength(0)
  })

  it('recusa tipo de evento desconhecido', async () => {
    await expect(as('anon', null, () => db.query(`insert into public.events (type) values ('hack')`))).rejects.toThrow(
      /check constraint/,
    )
  })
})
