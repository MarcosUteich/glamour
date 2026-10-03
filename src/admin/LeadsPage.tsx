import {
  Mail,
  Search,
  MessageCircle,
  ArrowLeft,
  Pencil,
  Check,
  Sheet,
  ArrowUpRight,
  X,
  RefreshCw,
  Clock3,
  CheckCheck,
  UserRoundPlus,
  Ban,
  Settings2,
  Play,
  MapPin,
  Star,
  ExternalLink,
  Phone,
  Loader2,
} from 'lucide-react'
import { LeadScrapingSettings } from './LeadScrapingSettings'
import { NavLink, useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { normalizeText } from '@/lib/slug'
import { AdminCard, EmptyState, FilterChip } from './ui'
import {
  fetchLeadsFromSheet,
  triggerN8nScraping,
  getLeadsConfig,
  saveLeadOverride,
  type SheetLead,
  type LeadStatus,
  type ScrapingPayload,
} from './leads-config'

type Channel = 'whatsapp' | 'email'
type Template = { id: number; name: string; channel: Channel; subject: string; body: string }

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 1,
    name: 'Apresentação Atacado (WhatsApp)',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá, tudo bem? Vi a {{empresa}} em {{cidade}} e achei o trabalho de vocês incrível! Nós somos a Glamour Joias no atacado. Trabalhamos com semijoias finas com alta margem de revenda para o seu segmento de {{nicho}}.\n\nVocê pode conferir nosso catálogo completo aqui: {{catalogo}}\n\nPodemos enviar nossa tabela de atacado para você?',
  },
  {
    id: 2,
    name: 'Apresentação Comercial (E-mail)',
    channel: 'email',
    subject: 'Parceria no atacado para {{empresa}} - Glamour Joias',
    body: 'Olá equipe da {{empresa}},\n\nEsperamos que este e-mail os encontre bem!\n\nConhecemos o trabalho de vocês em {{cidade}} e acreditamos que nossas semijoias e joias combinam perfeitamente com o público de {{nicho}} de vocês.\n\nOferecemos condições especiais para lojistas e revendedores, peças antialérgicas, banho de altíssima durabilidade e garantia.\n\nCatálogo online: {{catalogo}}\n\nFicamos à disposição para apresentar nossos produtos e condições!\n\nAtenciosamente,\nGlamour Atacado',
  },
  {
    id: 3,
    name: 'Follow-up / Segunda mensagem',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá! Passando apenas para saber se conseguiram dar uma olhada no catálogo da Glamour Joias que enviei recentemente. Se quiser, posso te enviar os produtos mais vendidos para o nicho de {{nicho}} em {{cidade}}!',
  },
]

const STATUSES: { value: LeadStatus; label: string; style: string }[] = [
  { value: 'novo', label: 'Novo', style: 'bg-malva-100 text-malva-800' },
  { value: 'sem_resposta', label: 'Sem resposta', style: 'bg-amber-50 text-amber-800' },
  { value: 'respondido', label: 'Respondido', style: 'bg-blue-50 text-blue-700' },
  { value: 'interessado', label: 'Interessado', style: 'bg-emerald-50 text-emerald-800 font-semibold' },
  { value: 'cliente', label: 'Cliente', style: 'bg-ok-fundo text-ok font-semibold' },
  { value: 'sem_interesse', label: 'Sem interesse', style: 'bg-gray-100 text-gray-600' },
]

const SELECT_CLASS = 'h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-tinta'

function personalize(text: string, lead: SheetLead) {
  const values: Record<string, string> = {
    empresa: lead.empresa || 'sua empresa',
    cidade: lead.cidade || 'sua região',
    nicho: lead.nicho || 'seu segmento',
    catalogo: 'https://glamourlindoia.com.br/',
  }
  return text.replace(/\{\{\s*(empresa|cidade|nicho|catalogo)\s*\}\}/g, (_, key: string) => values[key] || '')
}

type Queue = 'novos' | 'sem-resposta' | 'respondidos' | 'sem-interesse'
const QUEUES = [
  { key: 'novos' as const, title: 'Novos leads', description: 'Contatos da planilha que ainda não receberam uma abordagem.', icon: UserRoundPlus },
  { key: 'sem-resposta' as const, title: 'Sem resposta', description: 'Contatos já abordados que ainda não retornaram.', icon: Clock3 },
  { key: 'respondidos' as const, title: 'Respondidos', description: 'Conversas em andamento, interessados e clientes.', icon: CheckCheck },
  { key: 'sem-interesse' as const, title: 'Sem interesse', description: 'Histórico de contatos que recusaram a proposta. Fora da fila de abordagem.', icon: Ban },
]

function inQueue(lead: SheetLead, queue: Queue) {
  if (queue === 'novos') return lead.status === 'novo'
  if (queue === 'sem-resposta') return lead.status === 'sem_resposta'
  if (queue === 'sem-interesse') return lead.status === 'sem_interesse'
  return ['respondido', 'interessado', 'cliente'].includes(lead.status)
}

export function LeadsPage() {
  const [leads, setLeads] = useState<SheetLead[]>([])
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Template | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [showScrapeModal, setShowScrapeModal] = useState(false)

  const location = useLocation()
  const section = location.pathname.split('/')[3] ?? 'novos'
  const isTemplates = section === 'templates'
  const isSettings = section === 'config'
  const queue = QUEUES.find((item) => item.key === section) ?? QUEUES[0]

  const loadLeads = async (silent = false) => {
    setLoadingSheet(true)
    try {
      const data = await fetchLeadsFromSheet()
      setLeads(data)
      if (!silent) {
        toast.success(`${data.length} leads carregados da planilha do Google Sheets!`)
      }
    } catch (err) {
      console.warn('Erro ao carregar do Sheets:', err)
      if (!silent) {
        toast.error('Não foi possível ler a planilha do Google Sheets. Verifique o ID nas configurações ou torne a planilha pública.')
      }
    } finally {
      setLoadingSheet(false)
    }
  }

  useEffect(() => {
    loadLeads(true)
  }, [])

  const term = normalizeText(search)
  const filtered = leads.filter(
    (lead) =>
      inQueue(lead, queue.key) &&
      normalizeText(`${lead.empresa} ${lead.cidade} ${lead.nicho} ${lead.email} ${lead.telefone} ${lead.bairro}`).includes(term),
  )

  const selected = filtered.find((lead) => lead.id === selectedId)

  const updateLead = (id: number, patch: Partial<SheetLead>) => {
    setLeads((items) =>
      items.map((lead) => {
        if (lead.id === id) {
          const updated = { ...lead, ...patch }
          saveLeadOverride(lead.leadKey, {
            status: updated.status,
            notes: updated.notes,
            lastContact: updated.lastContact,
          })
          return updated
        }
        return lead
      }),
    )
  }

  const closeDetail = () => setSelectedId(null)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prospecção B2B / Atacado</p>
          <h1 className="text-2xl font-semibold text-malva-800">Leads e contatos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Scraping no Google Maps integrado ao n8n e sincronizado em tempo real com o Google Sheets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowScrapeModal(true)}
            className="gap-2 bg-malva-700 text-white hover:bg-malva-800 shadow-sm"
          >
            Nova busca de leads (Scraping)
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Sheet className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-tinta">
              Google Sheets <span className="font-normal text-muted-foreground">/ {getLeadsConfig().sheetName || 'Página1'}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {leads.length > 0 ? `${leads.length} leads salvos na base da planilha.` : 'Sua planilha de leads será a origem dos contatos.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NavLink
            to="/admin/leads/config"
            onClick={closeDetail}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-malva-800 hover:bg-malva-50"
          >
            <Settings2 className="size-4" />
            Configurar Token & n8n
          </NavLink>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLeads(false)}
            disabled={loadingSheet}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${loadingSheet ? 'animate-spin text-malva-600' : ''}`} />
            {loadingSheet ? 'Sincronizando...' : 'Sincronizar planilha'}
          </Button>
        </div>
      </div>

      <nav aria-label="Etapas dos leads" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {QUEUES.map((item) => (
          <NavLink
            key={item.key}
            to={item.key === 'novos' ? '/admin/leads' : `/admin/leads/${item.key}`}
            end
            onClick={closeDetail}
            className={`rounded-2xl border p-4 transition-colors ${!isTemplates && !isSettings && queue.key === item.key
              ? 'border-malva-500 bg-malva-700 text-white shadow-sm'
              : 'border-border bg-white text-malva-800 hover:border-malva-300'
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <item.icon className="size-4 opacity-75" />
              <span className="text-2xl font-semibold tabular-nums">
                {leads.filter((lead) => inQueue(lead, item.key)).length}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold">{item.title}</p>
          </NavLink>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-malva-800">
            {isSettings ? 'Configurações de Integração' : isTemplates ? 'Templates de mensagens' : queue.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSettings
              ? 'Defina ou substitua o token da Apify, URL do webhook n8n e ID do Google Sheets.'
              : isTemplates
                ? 'Prepare uma abordagem para cada etapa da conversa.'
                : queue.description}
          </p>
        </div>
        {isSettings ? null : isTemplates ? (
          <Button
            size="sm"
            onClick={() =>
              setEditing({
                id: Date.now(),
                name: '',
                channel: 'whatsapp',
                subject: '',
                body: '',
              })
            }
          >
            Novo template
          </Button>
        ) : (
          <NavLink
            to="/admin/leads/templates"
            onClick={closeDetail}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-malva-800 hover:bg-malva-50"
          >
            <MessageCircle className="size-4" />
            Templates de Mensagens
            <ArrowUpRight className="size-4" />
          </NavLink>
        )}
      </div>

      {isSettings ? (
        <LeadScrapingSettings />
      ) : isTemplates ? (
        editing ? (
          <TemplateEditor
            key={editing.id}
            template={editing}
            onCancel={() => setEditing(null)}
            onSave={(updated) => {
              setTemplates((prev) => {
                const exists = prev.some((t) => t.id === updated.id)
                if (exists) return prev.map((t) => (t.id === updated.id ? updated : t))
                return [...prev, updated]
              })
              setEditing(null)
              toast.success('Template salvo!')
            }}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.length === 0 && (
              <div className="lg:col-span-2">
                <EmptyState>Nenhum template cadastrado.</EmptyState>
              </div>
            )}
            {templates.map((template) => (
              <AdminCard key={template.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {template.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                    </p>
                    <h3 className="font-semibold text-malva-800">{template.name}</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(template)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                </div>
                {template.subject && <p className="mb-2 text-sm font-medium text-tinta">{template.subject}</p>}
                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-muted-foreground">
                  {template.body}
                </p>
              </AdminCard>
            ))}
          </div>
        )
      ) : (
        <div className={`grid items-start gap-5 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_420px]' : ''}`}>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white">
            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input
                  aria-label="Buscar leads"
                  className="pl-9"
                  placeholder="Buscar por empresa, nicho, cidade ou contato…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    closeDetail()
                  }}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <EmptyState>
                  {leads.length === 0
                    ? 'Nenhum lead carregado ainda. Clique em "Nova busca de leads (Scraping)" ou "Sincronizar planilha".'
                    : 'Nenhum lead encontrado com os filtros e busca atuais.'}
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_100px] gap-4 border-b border-border bg-malva-50/50 px-5 py-3 text-xs font-medium text-muted-foreground lg:grid">
                  <span>Empresa / Localização</span>
                  <span>Contatos</span>
                  <span>{queue.key === 'novos' ? 'Status' : 'Último contato'}</span>
                  <span className="text-right">Ação</span>
                </div>
                <ul className="divide-y divide-border">
                  {filtered.map((lead) => {
                    const state = STATUSES.find((item) => item.value === lead.status) || STATUSES[0]
                    const initials = (lead.empresa || 'LE')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()

                    return (
                      <li key={lead.id}>
                        <button
                          type="button"
                          aria-pressed={selectedId === lead.id}
                          onClick={() => setSelectedId(lead.id)}
                          className={`grid w-full items-center gap-3 px-5 py-4 text-left transition-colors lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_100px] lg:gap-4 ${selectedId === lead.id ? 'bg-malva-50' : 'hover:bg-malva-50/50'
                            }`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-malva-200 bg-malva-100 font-semibold text-malva-800 text-sm">
                              {initials}
                            </span>
                            <div className="min-w-0">
                              <p className="wrap-break-word font-semibold text-tinta">{lead.empresa}</p>
                              {lead.nicho && <p className="mt-0.5 text-xs text-malva-700 font-medium">{lead.nicho}</p>}
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {lead.cidade || 'Cidade não inf.'} {lead.bairro ? `· ${lead.bairro}` : ''}
                              </p>
                              {lead.avaliacao && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                                  <Star className="size-3 fill-amber-400 text-amber-500" />
                                  {lead.avaliacao} ({lead.avaliacoes || '0'})
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1.5 text-xs text-muted-foreground">
                            {lead.telefone && (
                              <p className="flex items-center gap-1.5 font-medium text-emerald-800">
                                <MessageCircle className="size-3.5 shrink-0 text-emerald-600" />
                                {lead.telefone}
                              </p>
                            )}
                            {lead.email && (
                              <p className="flex items-center gap-1.5 truncate">
                                <Mail className="size-3.5 shrink-0 text-malva-600" />
                                <span className="truncate">{lead.email}</span>
                              </p>
                            )}
                            {lead.instagram && (
                              <p className="flex items-center gap-1.5 truncate text-pink-700">
                                <span className="font-semibold">@</span>
                                <span className="truncate">{lead.instagram.replace(/^@/, '')}</span>
                              </p>
                            )}
                            {!lead.telefone && !lead.email && !lead.instagram && (
                              <p className="text-gray-400 italic">Sem contato direto</p>
                            )}
                          </div>

                          <div>
                            {queue.key === 'novos' ? (
                              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${state.style}`}>
                                {state.label}
                              </span>
                            ) : (
                              <>
                                <p className="text-xs text-muted-foreground">{lead.lastContact}</p>
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.style}`}>
                                  {state.label}
                                </span>
                              </>
                            )}
                          </div>

                          <span className="flex items-center gap-1 text-xs font-semibold text-malva-700 lg:justify-end">
                            Ver detalhes
                            <ArrowUpRight className="size-3.5" />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground flex justify-between">
              <span>
                {filtered.length} {filtered.length === 1 ? 'lead nesta fila' : 'leads nesta fila'}
              </span>
              <span>Total na planilha: {leads.length}</span>
            </div>
          </div>

          {selected && (
            <LeadPreview
              key={selected.id}
              lead={selected}
              templates={templates}
              onClose={closeDetail}
              onUpdate={(patch) => updateLead(selected.id, patch)}
            />
          )}
        </div>
      )}

      {showScrapeModal && (
        <ScrapingModal
          onClose={() => setShowScrapeModal(false)}
          onSuccess={() => {
            setShowScrapeModal(false)
            loadLeads(false)
          }}
        />
      )}
    </div>
  )
}

function ScrapingModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const config = getLeadsConfig()
  const [nicho, setNicho] = useState('joalheria')
  const [tipoLocalizacao, setTipoLocalizacao] = useState<'CIDADE' | 'BAIRRO' | 'CEP'>('CIDADE')
  const [cidade, setCidade] = useState('Porto Alegre')
  const [estado, setEstado] = useState('RS')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [limiteBusca, setLimiteBusca] = useState(80)
  const [limiteSalvar, setLimiteSalvar] = useState(80)
  const [apifyToken, setApifyToken] = useState(config.apifyToken || '')
  const [loading, setLoading] = useState(false)

  const handleStartScraping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nicho.trim()) {
      toast.error('Informe o nicho de busca.')
      return
    }
    if (tipoLocalizacao === 'CIDADE' && !cidade.trim()) {
      toast.error('Informe a cidade.')
      return
    }
    if (tipoLocalizacao === 'BAIRRO' && (!bairro.trim() || !cidade.trim())) {
      toast.error('Informe o bairro e a cidade.')
      return
    }
    if (tipoLocalizacao === 'CEP' && !cep.replace(/\D/g, '')) {
      toast.error('Informe o CEP.')
      return
    }

    setLoading(true)
    const payload: ScrapingPayload = {
      nicho: nicho.trim(),
      tipoLocalizacao,
      cidade: cidade.trim(),
      estado: estado.trim(),
      bairro: bairro.trim(),
      cep: cep.trim(),
      limiteBusca: Number(limiteBusca) || 80,
      limiteSalvar: Number(limiteSalvar) || 80,
      apifyToken: apifyToken.trim(),
    }

    try {
      await triggerN8nScraping(payload)
      toast.success('Busca de leads iniciada no n8n com sucesso! Os leads serão processados e salvos no Google Sheets.')
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao conectar com n8n'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border bg-malva-50/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-malva-900">Buscar novos leads (Google Maps / Apify)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-tinta"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleStartScraping} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-malva-900">
              Nicho / Ramo de Atuação <span className="text-red-500">*</span>
            </label>
            <Input
              className="mt-1"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              placeholder="Ex.: joalheria, ótica, boutique, loja de semijoias"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm font-medium text-malva-900 col-span-3">
              Tipo de Localização
            </label>
            {(['CIDADE', 'BAIRRO', 'CEP'] as const).map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => setTipoLocalizacao(tipo)}
                className={`rounded-xl border py-2 text-sm font-medium transition-colors ${tipoLocalizacao === tipo
                  ? 'border-malva-600 bg-malva-700 text-white shadow-xs'
                  : 'border-border bg-white text-tinta hover:bg-malva-50'
                  }`}
              >
                {tipo === 'CIDADE' ? 'Cidade' : tipo === 'BAIRRO' ? 'Bairro' : 'CEP'}
              </button>
            ))}
          </div>

          {tipoLocalizacao !== 'CEP' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-malva-900">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Porto Alegre"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-malva-900">Estado (UF)</label>
                <Input
                  className="mt-1"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="RS"
                  maxLength={2}
                />
              </div>
            </div>
          )}

          {tipoLocalizacao === 'BAIRRO' && (
            <div>
              <label className="block text-sm font-medium text-malva-900">
                Bairro <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex.: Moinhos de Vento"
                required
              />
            </div>
          )}

          {tipoLocalizacao === 'CEP' && (
            <div>
              <label className="block text-sm font-medium text-malva-900">
                CEP (8 dígitos) <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="90000-000"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Limite de busca no Maps
              </label>
              <Input
                className="mt-1"
                type="number"
                min={5}
                max={500}
                value={limiteBusca}
                onChange={(e) => setLimiteBusca(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">
                Limite max. para salvar
              </label>
              <Input
                className="mt-1"
                type="number"
                min={5}
                max={500}
                value={limiteSalvar}
                onChange={(e) => setLimiteSalvar(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Token Apify (opcional se já salvo nas configurações)
            </label>
            <Input
              className="mt-1"
              type="password"
              value={apifyToken}
              onChange={(e) => setApifyToken(e.target.value)}
              placeholder="apify_api_..."
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-malva-700 hover:bg-malva-800 text-white"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {loading ? 'Disparando fluxo...' : 'Iniciar Scraping no n8n'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LeadPreview({
  lead,
  templates,
  onUpdate,
  onClose,
}: {
  lead: SheetLead
  templates: Template[]
  onUpdate: (patch: Partial<SheetLead>) => void
  onClose: () => void
}) {
  const [channel, setChannel] = useState<Channel>(lead.telefone ? 'whatsapp' : 'email')
  const available = templates.filter((template) => template.channel === channel)
  const [templateId, setTemplateId] = useState(available[0]?.id ?? 0)
  const [customBody, setCustomBody] = useState<string | null>(null)

  const template = available.find((item) => item.id === templateId) ?? available[0]
  const body = customBody ?? (template ? personalize(template.body, lead) : '')

  const phoneDigits = (lead.telefone || '').replace(/\D/g, '')
  const whatsappUrl = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`}?text=${encodeURIComponent(body)}`
    : ''

  const emailSubject = template?.subject ? personalize(template.subject, lead) : `Apresentação Comercial - Glamour Joias`
  const mailtoUrl = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}` : ''

  const handleOpenContact = () => {
    if (channel === 'whatsapp' && whatsappUrl) {
      onUpdate({ status: lead.status === 'novo' ? 'sem_resposta' : lead.status, lastContact: 'Hoje' })
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    } else if (channel === 'email' && mailtoUrl) {
      onUpdate({ status: lead.status === 'novo' ? 'sem_resposta' : lead.status, lastContact: 'Hoje' })
      window.open(mailtoUrl, '_blank')
    }
  }

  return (
    <AdminCard className="min-w-0 xl:sticky xl:top-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-malva-800 leading-tight">{lead.empresa}</h2>
        <button
          type="button"
          aria-label="Fechar detalhes"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-malva-50"
        >
          <X className="size-5" />
        </button>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {lead.nicho} · {lead.cidade}
      </p>

      <dl className="my-4 space-y-2.5 border-y border-border py-4 text-sm">
        {lead.endereco && (
          <div>
            <dt className="text-xs text-muted-foreground">Endereço</dt>
            <dd className="text-tinta font-medium flex items-center gap-1.5 mt-0.5">
              <MapPin className="size-3.5 text-malva-600 shrink-0" />
              {lead.endereco}
            </dd>
          </div>
        )}

        <div>
          <dt className="text-xs text-muted-foreground">Telefone</dt>
          <dd className="text-tinta font-medium flex items-center gap-1.5 mt-0.5">
            <Phone className="size-3.5 text-emerald-600 shrink-0" />
            {lead.telefone || <span className="text-muted-foreground font-normal">Não informado</span>}
          </dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">E-mail</dt>
          <dd className="break-all text-tinta font-medium flex items-center gap-1.5 mt-0.5">
            <Mail className="size-3.5 text-malva-600 shrink-0" />
            {lead.email || <span className="text-muted-foreground font-normal">Não informado</span>}
          </dd>
        </div>

        {lead.instagram && (
          <div>
            <dt className="text-xs text-muted-foreground">Instagram</dt>
            <dd className="text-pink-700 font-medium flex items-center gap-1.5 mt-0.5">
              <a
                href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                @{lead.instagram.replace(/^@|https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}
                <ExternalLink className="size-3" />
              </a>
            </dd>
          </div>
        )}

        {lead.googleMaps && (
          <div>
            <dt className="text-xs text-muted-foreground">Google Maps</dt>
            <dd className="mt-0.5">
              <a
                href={lead.googleMaps}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-malva-700 hover:underline font-medium"
              >
                Abrir ficha no Maps <ExternalLink className="size-3" />
              </a>
            </dd>
          </div>
        )}
      </dl>

      <label className="block text-sm font-medium text-malva-800">
        Status do lead
        <select
          className={`${SELECT_CLASS} mt-2`}
          value={lead.status}
          onChange={(event) => onUpdate({ status: event.target.value as LeadStatus })}
        >
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-medium text-malva-800">
        Anotações internas
        <Textarea
          className="mt-2"
          placeholder="Ex.: pediu catálogo no WhatsApp, retorno marcado para segunda..."
          value={lead.notes}
          onChange={(event) => onUpdate({ notes: event.target.value })}
        />
      </label>

      {lead.status === 'sem_interesse' ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4 border border-gray-200">
          <p className="text-sm font-semibold text-tinta">Contato encerrado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Este lead não está na fila de abordagem ativa. Mantenha aqui o histórico e o motivo da recusa.
          </p>
        </div>
      ) : (
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-3 font-semibold text-malva-800">Preparar mensagem e abordagem</h3>
          <div className="mb-3 flex gap-2">
            {(['whatsapp', 'email'] as const).map((value) => (
              <FilterChip
                key={value}
                active={channel === value}
                onClick={() => {
                  setChannel(value)
                  setTemplateId(templates.find((item) => item.channel === value)?.id ?? 0)
                  setCustomBody(null)
                }}
              >
                {value === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
              </FilterChip>
            ))}
          </div>

          <label className="block text-sm font-medium text-malva-800">
            Modelo de Template
            <select
              className={`${SELECT_CLASS} mt-2`}
              value={template?.id ?? ''}
              onChange={(event) => {
                setTemplateId(Number(event.target.value))
                setCustomBody(null)
              }}
            >
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {channel === 'email' && template && (
            <div className="mt-3 rounded-lg bg-malva-50 p-3 text-sm">
              <span className="text-xs text-muted-foreground font-semibold">Assunto do e-mail</span>
              <p className="mt-1 font-medium">{personalize(template.subject || emailSubject, lead)}</p>
            </div>
          )}

          <label className="mt-3 block text-sm font-medium text-malva-800">
            Prévia da mensagem
            <Textarea
              className="mt-2 min-h-40 text-sm leading-relaxed"
              value={body}
              onChange={(event) => setCustomBody(event.target.value)}
            />
          </label>

          <Button
            className="mt-4 w-full gap-2"
            variant={channel === 'whatsapp' ? 'whatsapp' : 'default'}
            disabled={channel === 'whatsapp' ? !lead.telefone : !lead.email}
            onClick={handleOpenContact}
          >
            {channel === 'whatsapp' ? <MessageCircle className="size-4" /> : <Mail className="size-4" />}
            {channel === 'whatsapp'
              ? lead.telefone
                ? 'Enviar abordagem no WhatsApp'
                : 'Telefone não cadastrado'
              : lead.email
                ? 'Abrir no cliente de e-mail'
                : 'E-mail não cadastrado'}
          </Button>
        </div>
      )}
    </AdminCard>
  )
}

function TemplateEditor({
  template,
  onCancel,
  onSave,
}: {
  template: Template
  onCancel: () => void
  onSave: (template: Template) => void
}) {
  const [draft, setDraft] = useState(template)

  return (
    <AdminCard className="max-w-3xl">
      <button type="button" onClick={onCancel} className="mb-4 flex items-center gap-1 text-sm text-malva-700">
        <ArrowLeft className="size-4" />
        Voltar aos templates
      </button>
      <h3 className="mb-4 font-semibold text-malva-800">{template.name ? 'Editar template' : 'Novo template'}</h3>

      <div className="space-y-4">
        <label className="block text-sm font-medium">
          Nome do template
          <Input
            className="mt-2"
            value={draft.name}
            placeholder="Ex.: Primeiro contato"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>

        <label className="block text-sm font-medium">
          Canal
          <select
            className={`${SELECT_CLASS} mt-2`}
            value={draft.channel}
            onChange={(event) => setDraft({ ...draft, channel: event.target.value as Channel })}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </select>
        </label>

        {draft.channel === 'email' && (
          <label className="block text-sm font-medium">
            Assunto do e-mail
            <Input
              className="mt-2"
              value={draft.subject}
              onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
            />
          </label>
        )}

        <label className="block text-sm font-medium">
          Conteúdo da mensagem
          <Textarea
            className="mt-2 min-h-56 font-normal leading-relaxed"
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Tags disponíveis:{' '}
          <code className="rounded bg-malva-50 px-1 py-0.5 text-malva-800">{'{{empresa}}'}</code>,{' '}
          <code className="rounded bg-malva-50 px-1 py-0.5 text-malva-800">{'{{cidade}}'}</code>,{' '}
          <code className="rounded bg-malva-50 px-1 py-0.5 text-malva-800">{'{{nicho}}'}</code> e{' '}
          <code className="rounded bg-malva-50 px-1 py-0.5 text-malva-800">{'{{catalogo}}'}</code>.
        </p>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(draft)} className="gap-2" disabled={!draft.name.trim() || !draft.body.trim()}>
            <Check className="size-4" />
            Salvar template
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </AdminCard>
  )
}
