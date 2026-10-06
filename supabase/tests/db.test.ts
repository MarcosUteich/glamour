// Roda as migrations num Postgres em memória (PGlite) imitando o Supabase
// (papéis anon/authenticated, auth.uid() e permissões padrão) e confere regras e segurança.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { wholesalePriceCents } from '../../src/seo/pricing'

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
  const migrations = [
    '0001_schema.sql',
    '0002_rls.sql',
    '0003_functions.sql',
    '0005_order_lookup.sql',
    '0006_seo.sql',
    '0007_origem_e_fotos.sql',
    '0008_como_comprar.sql',
    '0009_desconto_atacado.sql',
  ]
  for (const file of migrations) {
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

describe('get_orders_by_phone (consulta sem login)', () => {
  const PHONE_A = '51988880001'
  const PHONE_B = '51988880002'

  async function ordersByPhone(phone: string) {
    const { rows } = await as('anon', null, () =>
      db.query<{ r: unknown }>('select public.get_orders_by_phone($1) as r', [phone]),
    )
    return rows[0].r as Array<Record<string, unknown>>
  }

  it('devolve só os pedidos daquele telefone, com os itens', async () => {
    const a1 = await as('anon', null, () => createOrder(PHONE_A, [{ product_id: P_BRINCO, quantity: 20 }]))
    const a2 = await as('anon', null, () => createOrder(PHONE_A, [{ product_id: P_COLAR, quantity: 7 }]))
    await as('anon', null, () => createOrder(PHONE_B, [{ product_id: P_BRINCO, quantity: 20 }]))

    const list = await ordersByPhone(PHONE_A)
    expect(list.map((o) => o.order_number).sort()).toEqual([a1.order_number, a2.order_number].sort())
    const withItems = list.find((o) => o.order_number === a2.order_number) as { items: Array<{ code: string }> }
    expect(withItems.items).toEqual([expect.objectContaining({ code: 'CL-101', quantity: 7 })])
  })

  it('telefone sem pedidos devolve lista vazia, não erro', async () => {
    expect(await ordersByPhone('51988889999')).toEqual([])
  })

  it('recusa telefone inválido', async () => {
    await expect(ordersByPhone('123')).rejects.toThrow(/invalid_phone/)
  })

  it('aceita o telefone com ou sem +55/máscara', async () => {
    const withPlus55 = await ordersByPhone(`+55 (${PHONE_A.slice(0, 2)}) ${PHONE_A.slice(2, 7)}-${PHONE_A.slice(7)}`)
    expect(withPlus55.length).toBeGreaterThan(0)
  })

  it('limita a 20 consultas por telefone em 10 minutos', async () => {
    const phone = '51988880099'
    for (let i = 0; i < 20; i++) await ordersByPhone(phone)
    await expect(ordersByPhone(phone)).rejects.toThrow(/rate_limited/)
  })

  it('não fica registrado em lugar acessível ao anônimo', async () => {
    const rows = await as('anon', null, async () => (await db.query('select * from public.phone_lookups')).rows)
    expect(rows).toHaveLength(0)
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

describe('origem do pedido (migration 0007)', () => {
  const ORIGIN = {
    first: { source: 'instagram', medium: 'bio', at: '2026-10-12T10:00:00Z' },
    last: { source: 'google', medium: 'cpc', ids: { gclid: 'abc' }, at: '2026-10-13T10:00:00Z' },
  }

  async function createWithOrigin(phone: string, attribution: unknown) {
    const { rows } = await as('anon', null, () =>
      db.query<{ r: Record<string, unknown> }>('select public.create_order($1, $2, $3::jsonb, $4::jsonb) as r', [
        'Ana Souza',
        phone,
        JSON.stringify([{ product_id: P_BRINCO, quantity: 20 }]),
        JSON.stringify(attribution),
      ]),
    )
    const order = rows[0].r
    const saved = await db.query<{ attribution: unknown }>('select attribution from public.orders where order_number = $1', [
      order.order_number,
    ])
    return saved.rows[0].attribution
  }

  it('guarda de onde a cliente chegou', async () => {
    expect(await createWithOrigin('51977770001', ORIGIN)).toEqual(ORIGIN)
  })

  it('a chamada antiga, sem origem, continua funcionando', async () => {
    const r = await as('anon', null, () => createOrder('51977770002', [{ product_id: P_BRINCO, quantity: 20 }]))
    const { rows } = await db.query<{ attribution: unknown }>('select attribution from public.orders where order_number = $1', [
      r.order_number,
    ])
    expect(rows[0].attribution).toBeNull()
  })

  it('origem inválida ou grande demais é descartada sem impedir o pedido', async () => {
    expect(await createWithOrigin('51977770003', ['não', 'é', 'objeto'])).toBeNull()
    expect(await createWithOrigin('51977770004', { first: { source: 'x'.repeat(5000) } })).toBeNull()
  })

  it('visitante não lê a origem gravada', async () => {
    const rows = await as('anon', null, async () => (await db.query('select attribution from public.orders')).rows)
    expect(rows).toHaveLength(0)
  })

  it('painel mostra pedidos por origem', async () => {
    const { rows } = await as('authenticated', ADMIN, () =>
      db.query<{ r: { by_source: Array<{ source: string; n: number }> } }>(
        `select public.admin_dashboard(now() - interval '1 day', now() + interval '1 minute') as r`,
      ),
    )
    const sources = rows[0].r.by_source.map((s) => s.source)
    expect(sources).toContain('google')
    expect(sources).toContain('sem registro')
  })

  it('foto ganha a coluna do JPEG para compartilhar', async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from information_schema.columns where table_name = 'product_images' and column_name = 'path_share'`,
    )
    expect(rows[0].n).toBe(1)
  })
})

describe('perguntas da página Como comprar (migration 0008)', () => {
  const FAQ = [{ question: 'Aceitam Pix?', answer: 'Sim.' }]

  it('começa vazia (o site usa as perguntas padrão) e o visitante lê', async () => {
    const rows = await as('anon', null, async () => (await db.query('select faq from public.settings')).rows)
    expect(rows[0]).toEqual({ faq: null })
  })

  it('visitante não altera as perguntas', async () => {
    await as('anon', null, () => db.query('update public.settings set faq = $1::jsonb', [JSON.stringify(FAQ)]))
    await as('authenticated', CUSTOMER_USER, () => db.query('update public.settings set faq = $1::jsonb', [JSON.stringify(FAQ)]))
    expect((await db.query<{ faq: unknown }>('select faq from public.settings')).rows[0].faq).toBeNull()
  })

  it('admin salva a lista', async () => {
    await as('authenticated', ADMIN, () => db.query('update public.settings set faq = $1::jsonb', [JSON.stringify(FAQ)]))
    expect((await db.query<{ faq: unknown }>('select faq from public.settings')).rows[0].faq).toEqual(FAQ)
  })

  it('o banco recusa o que não é lista ou é grande demais', async () => {
    const tooMany = Array.from({ length: 31 }, (_, i) => ({ question: `P${i}`, answer: 'R' }))
    await expect(
      as('authenticated', ADMIN, () => db.query(`update public.settings set faq = '{"question": "x"}'::jsonb`)),
    ).rejects.toThrow()
    await expect(
      as('authenticated', ADMIN, () => db.query('update public.settings set faq = $1::jsonb', [JSON.stringify(tooMany)])),
    ).rejects.toThrow()
  })

  it('pode rodar de novo sem erro', async () => {
    await db.exec(sql('migrations/0008_como_comprar.sql'))
    expect((await db.query<{ faq: unknown }>('select faq from public.settings')).rows[0].faq).toEqual(FAQ)
  })
})

describe('desconto de atacado (migration 0009)', () => {
  const setDiscount = (pct: number) =>
    as('authenticated', ADMIN, () => db.query('update public.settings set wholesale_discount_pct = $1', [pct]))
  const discount = async () =>
    (await db.query<{ pct: number }>('select wholesale_discount_pct as pct from public.settings')).rows[0].pct

  it('começa em 0% (nada muda) e o visitante lê', async () => {
    const rows = await as('anon', null, async () => (await db.query('select wholesale_discount_pct from public.settings')).rows)
    expect(rows[0]).toEqual({ wholesale_discount_pct: 0 })
  })

  it('só o admin muda o desconto, de 0 a 90%', async () => {
    await as('anon', null, () => db.query('update public.settings set wholesale_discount_pct = 50'))
    await as('authenticated', CUSTOMER_USER, () => db.query('update public.settings set wholesale_discount_pct = 50'))
    expect(await discount()).toBe(0)
    await expect(setDiscount(95)).rejects.toThrow(/check constraint/)
    await expect(setDiscount(-1)).rejects.toThrow(/check constraint/)
  })

  it('o pedido é cobrado pelo preço de atacado', async () => {
    await setDiscount(30)
    try {
      const r = await as('anon', null, () =>
        createOrder('51966660001', [
          { product_id: P_BRINCO, quantity: 20 },
          { product_id: P_COLAR, quantity: 3 },
        ]),
      )
      // 24,90 → 17,43 e 79,90 → 55,93
      expect(r.items).toEqual([
        expect.objectContaining({ code: 'BR-101', unit_price_cents: 1743, total_cents: 20 * 1743 }),
        expect.objectContaining({ code: 'CL-101', unit_price_cents: 5593, total_cents: 3 * 5593 }),
      ])
      expect(r.total_cents).toBe(20 * 1743 + 3 * 5593)
      const saved = await db.query<{ unit_price_cents: number }>(
        `select oi.unit_price_cents from public.order_items oi join public.orders o on o.id = oi.order_id
         where o.order_number = $1 order by oi.product_code`,
        [r.order_number],
      )
      expect(saved.rows.map((row) => row.unit_price_cents)).toEqual([1743, 5593])
    } finally {
      await setDiscount(0)
    }
  })

  it('o pedido mínimo conta o total já com desconto', async () => {
    // 20 brincos: R$ 498,00 cheio (passa do mínimo de R$ 490), R$ 348,60 com 30% (não passa)
    await setDiscount(30)
    try {
      await expect(
        as('anon', null, () => createOrder('51966660002', [{ product_id: P_BRINCO, quantity: 20 }])),
      ).rejects.toThrow(/below_minimum/)
    } finally {
      await setDiscount(0)
    }
  })

  it('a conta do banco é a mesma do site (src/seo/pricing.ts)', async () => {
    const prices = [1, 99, 101, 990, 1290, 1999, 2490, 4990, 7990, 12345, 99999, 1000050]
    const { rows } = await db.query<{ p: number; d: number; w: number }>(
      `select p, d, public.wholesale_price_cents(p, d) as w
       from unnest($1::integer[]) as p, generate_series(0, 90) as d`,
      [prices],
    )
    expect(rows).toHaveLength(prices.length * 91)
    const mismatches = rows.filter((row) => row.w !== wholesalePriceCents(row.p, row.d))
    expect(mismatches).toEqual([])
  })

  it('pode rodar de novo sem erro e mantém o desconto salvo', async () => {
    await setDiscount(25)
    try {
      await db.exec(sql('migrations/0009_desconto_atacado.sql'))
      expect(await discount()).toBe(25)
    } finally {
      await setDiscount(0)
    }
  })
})
