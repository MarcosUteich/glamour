export interface LeadScrapingConfig {
  apifyToken: string
  n8nWebhookUrl: string
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
  apifyToken?: string
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
  n8nUpdateWebhookUrl: 'https://n8n.glamourlindoia.com.br/webhook/leads-update',
  sheetId: '1ARtBNXi9JHnK7fzSeectXe8K_aEyGA1iyXnqOzieJsw',
  sheetName: 'Página1',
}

export function getLeadsConfig(): LeadScrapingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG)
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch (err) {
    console.error('Erro ao ler configuração de leads:', err)
  }
  return DEFAULT_CONFIG
}

export function saveLeadsConfig(config: Partial<LeadScrapingConfig>): LeadScrapingConfig {
  const current = getLeadsConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated))
  return updated
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let insideQuotes = false
  let currentField = ''

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        currentField += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(currentField.trim())
      currentField = ''
    } else {
      currentField += char
    }
  }
  result.push(currentField.trim())
  return result.map((f) => f.replace(/^"|"$/g, '').trim())
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) =>
    h
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''),
  )

  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    rows.push(row)
  }

  return rows
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
  if (!cfg.sheetId) {
    throw new Error('ID da planilha do Google Sheets não configurado.')
  }

  const sheetNameEncoded = encodeURIComponent(cfg.sheetName || 'Página1')

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetNameEncoded}`
  const exportUrl = `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/export?format=csv&gid=0`

  let csvText = ''
  try {
    const res = await fetch(gvizUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = await res.text()
  } catch {
    const res2 = await fetch(exportUrl)
    if (!res2.ok) throw new Error('Não foi possível carregar a planilha pública do Google Sheets.')
    csvText = await res2.text()
  }

  const rawRows = parseCSV(csvText)

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

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Falha ao sincronizar com Google Sheets via n8n (${response.status}): ${errorText || response.statusText}`)
  }

  return await response.json().catch(() => ({ success: true }))
}

export async function triggerN8nScraping(payload: ScrapingPayload, config?: LeadScrapingConfig) {
  const cfg = config ?? getLeadsConfig()
  if (!cfg.n8nWebhookUrl) {
    throw new Error('URL do Webhook do n8n não está configurada. Acesse "Token da Apify e Webhook" para configurar.')
  }

  const tokenToUse = payload.apifyToken || cfg.apifyToken
  if (!tokenToUse) {
    throw new Error('Token da Apify não informado. Digite o token no formulário ou configure-o nas configurações.')
  }

  const response = await fetch(cfg.n8nWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      apifyToken: tokenToUse,
      sheetId: cfg.sheetId,
      sheetName: cfg.sheetName,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Falha ao disparar n8n (${response.status}): ${errorText || response.statusText}`)
  }

  return await response.json().catch(() => ({ success: true }))
}
