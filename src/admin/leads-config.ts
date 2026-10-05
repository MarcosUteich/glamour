import { requireSupabase } from '@/lib/supabase'

export interface LeadScrapingConfig {
  apifyToken: string
  n8nWebhookUrl: string
  n8nReadWebhookUrl: string
  n8nUpdateWebhookUrl: string
  sheetId: string
  sheetName: string
}

export interface ScrapingPayload {
  nicho: string
  tipoLocalizacao: 'CIDADE' | 'BAIRRO' | 'CEP'
  cidade: string
  estado: string
  bairro?: string
  cep?: string
  limiteBusca: number
  limiteSalvar: number
}

export type LeadStatus = 'novo' | 'sem_resposta' | 'segundo_contato' | 'respondido' | 'interessado' | 'cliente' | 'sem_interesse'

export interface SheetLead {
  id: number
  dataCriacao: string
  empresa: string
  nicho: string
  cidade: string
  bairro: string
  cep: string
  endereco: string
  telefone: string
  email: string
  instagram: string
  googleMaps: string
  placeId: string
  avaliacao: string
  avaliacoes: string
  status: LeadStatus
  origem: string
  leadKey: string
  notes: string
  lastContact: string
}

const STORAGE_KEY_CONFIG = 'glamour_leads_config_v1'

export const DEFAULT_CONFIG: LeadScrapingConfig = {
  apifyToken: '',
  n8nWebhookUrl: 'https://n8n.glamourlindoia.com.br/webhook/leads-scraping',
  n8nReadWebhookUrl: 'https://n8n.glamourlindoia.com.br/webhook/leads-read',
  n8nUpdateWebhookUrl: 'https://n8n.glamourlindoia.com.br/webhook/leads-update',
  sheetId: '1ARtBNXi9JHnK7fzSeectXe8K_aEyGA1iyXnqOzieJsw',
  sheetName: 'Página1',
}

export function getLeadsConfig(): LeadScrapingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (raw) {
      const config = cleanConfig(JSON.parse(raw))
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
      return config
    }
  } catch (err) {
    console.error('Erro ao ler configuração de leads:', err)
  }
  return DEFAULT_CONFIG
}

export function saveLeadsConfig(config: Partial<LeadScrapingConfig>): LeadScrapingConfig {
  const current = getLeadsConfig()
  const updated = cleanConfig({ ...current, ...config })
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated))
  return updated
}

function cleanConfig(stored: Record<string, unknown>): LeadScrapingConfig {
  return Object.fromEntries(Object.entries(DEFAULT_CONFIG).map(([key, fallback]) => [
    key, typeof stored?.[key] === 'string' && stored[key].trim() ? stored[key] : fallback,
  ])) as unknown as LeadScrapingConfig
}

async function requestLeadsWebhook(url: string, init: RequestInit): Promise<unknown> {
  const target = new URL(url)
  if (target.origin !== 'https://n8n.glamourlindoia.com.br'
    || !target.pathname.startsWith('/webhook/') || target.username || target.password) {
    throw new Error('Configure um webhook de produção em https://n8n.glamourlindoia.com.br.')
  }
  const { data, error } = await requireSupabase().auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Faça login novamente para acessar os leads.')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${data.session.access_token}`)
  const response = await fetch(target.toString(), {
    ...init, headers, credentials: 'omit', redirect: 'error', cache: 'no-store',
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sessão inválida ou expirada. Faça login novamente.')
    if (response.status === 403) throw new Error('Acesso aos leads permitido somente para administradores no domínio da loja.')
    throw new Error(`Falha na integração de leads com n8n (${response.status}).`)
  }
  const result: unknown = await response.json()
  if (result && typeof result === 'object' && 'success' in result && result.success === false) {
    throw new Error('O n8n não confirmou a operação.')
  }
  return result
}

export function normalizeStatus(rawStatus: string): LeadStatus {
  const s = (rawStatus || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  if (s.includes('segundo') || s.includes('2') || s.includes('follow') || s === 'segundo_contato') return 'segundo_contato'
  if (s.includes('enviado') || s.includes('sem resposta') || s.includes('1') || s === 'sem_resposta') return 'sem_resposta'
  if (s.includes('respondido')) return 'respondido'
  if (s.includes('interessado')) return 'interessado'
  if (s.includes('cliente')) return 'cliente'
  if (s.includes('sem interesse') || s.includes('recusado') || s === 'sem_interesse') return 'sem_interesse'
  return 'novo'
}

export async function fetchLeadsFromSheet(config?: LeadScrapingConfig): Promise<SheetLead[]> {
  const cfg = config ?? getLeadsConfig()
  const result = await requestLeadsWebhook(cfg.n8nReadWebhookUrl, { method: 'GET' })
  const rows = Array.isArray(result) ? result
    : result && typeof result === 'object' && 'rows' in result ? result.rows : null
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Resposta inválida do webhook de leitura de leads.')
  }
  const rawRows: Record<string, string>[] = rows
    .filter(row => Object.keys(row).length > 0)
    .map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''),
      String(value ?? ''),
    ])))

  return rawRows.map((row, index) => {
    const dataCriacao = row.data || row.datacriacao || ''
    const empresa = row.empresa || row.title || row.name || 'Sem nome'
    const nicho = row.nicho || ''
    const cidade = row.cidade || ''
    const bairro = row.bairro || ''
    const cep = row.cep || ''
    const endereco = row.endereco || row.address || ''
    const telefone = row.telefone || row.phone || ''
    const email = row.email || ''
    const instagram = row.instagram || ''
    const googleMaps = row.googlemaps || row.url || ''
    const placeId = row.placeid || ''
    const avaliacao = row.avaliacao || row.rating || ''
    const avaliacoes = row.avaliacoes || row.reviews || ''
    const rawStatus = row.status || 'NOVO'
    const sheetNotes = row.anotacoes || row.notes || ''
    const sheetLastContact = row.ultimocontato || row.lastcontact || ''
    const origem = row.origem || 'Google Maps / Apify'
    const leadKey = row.leadkey || (placeId ? `place:${placeId}` : `lead:${index + 1}`)

    return {
      id: index + 1,
      dataCriacao,
      empresa,
      nicho,
      cidade,
      bairro,
      cep,
      endereco,
      telefone,
      email,
      instagram,
      googleMaps,
      placeId,
      avaliacao,
      avaliacoes,
      status: normalizeStatus(rawStatus),
      origem,
      leadKey,
      notes: sheetNotes,
      lastContact: sheetLastContact || (dataCriacao ? dataCriacao.split(' ')[0] : 'Hoje'),
    }
  })
}

export async function triggerN8nUpdateLead(
  lead: SheetLead,
  patch: { status?: LeadStatus; notes?: string; lastContact?: string },
  config?: LeadScrapingConfig,
) {
  const cfg = config ?? getLeadsConfig()
  const webhookUrl = cfg.n8nUpdateWebhookUrl || 'https://n8n.glamourlindoia.com.br/webhook/leads-update'

  if (!webhookUrl) {
    throw new Error('URL do Webhook de atualização do n8n não está configurada.')
  }

  const finalStatus = patch.status !== undefined ? patch.status : lead.status
  const finalNotes = patch.notes !== undefined ? patch.notes : lead.notes
  const finalLastContact = patch.lastContact !== undefined ? patch.lastContact : lead.lastContact

  const payload = {
    sheetId: cfg.sheetId,
    sheetName: cfg.sheetName,
    leadKey: lead.leadKey,
    placeId: lead.placeId,
    telefone: lead.telefone,
    empresa: lead.empresa,
    status: finalStatus.toUpperCase(),
    notes: finalNotes,
    lastContact: finalLastContact,
  }

  return requestLeadsWebhook(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function triggerN8nScraping(payload: ScrapingPayload, config?: LeadScrapingConfig) {
  const cfg = config ?? getLeadsConfig()
  if (!cfg.n8nWebhookUrl) {
    throw new Error('URL do Webhook do n8n não está configurada. Acesse as configurações da integração para configurar.')
  }

  const apifyToken = cfg.apifyToken.trim()
  if (!apifyToken) {
    throw new Error('Cadastre o token da Apify nas configurações de leads antes de iniciar a busca.')
  }

  return requestLeadsWebhook(cfg.n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, apifyToken, sheetId: cfg.sheetId, sheetName: cfg.sheetName }),
  })
}
