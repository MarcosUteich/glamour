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
  RotateCcw,
  LayoutGrid,
  List,
  GripVertical,
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
    name: '1º Contato - Apresentação Atacado (WhatsApp)',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá, tudo bem? Vi a {{empresa}} em {{cidade}} e achei o trabalho de vocês incrível! Nós somos a Glamour Joias no atacado. Trabalhamos com semijoias finas com alta margem de revenda para o seu segmento de {{nicho}}.\n\nVocê pode conferir nosso catálogo completo aqui: {{catalogo}}\n\nPodemos enviar nossa tabela de atacado para você?',
  },
  {
    id: 2,
    name: '2º Contato / Follow-up (WhatsApp)',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá! Passando apenas para saber se vocês da {{empresa}} conseguiram dar uma olhada no catálogo da Glamour Joias que enviei recentemente.\n\nSe quiser, posso te enviar uma seleção dos produtos mais vendidos para o nicho de {{nicho}} em {{cidade}} com condições especiais para novos parceiros!',
  },
  {
    id: 3,
    name: 'Apresentação Comercial (E-mail)',
    channel: 'email',
    subject: 'Parceria no atacado para {{empresa}} - Glamour Joias',
    body: 'Olá equipe da {{empresa}},\n\nEsperamos que este e-mail os encontre bem!\n\nConhecemos o trabalho de vocês em {{cidade}} e acreditamos que nossas semijoias e joias combinam perfeitamente com o público de {{nicho}} de vocês.\n\nOferecemos condições especiais para lojistas e revendedores, peças antialérgicas, banho de altíssima durabilidade e garantia.\n\nCatálogo online: {{catalogo}}\n\nFicamos à disposição para apresentar nossos produtos e condições!\n\nAtenciosamente,\nGlamour Atacado',
  },
]

export const STATUSES: { value: LeadStatus; label: string; style: string; badge: string }[] = [
  { value: 'novo', label: 'Novo Lead', style: 'bg-blue-50 text-blue-800 border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  { value: 'sem_resposta', label: '1º Contato Feito', style: 'bg-amber-50 text-amber-800 border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  { value: 'segundo_contato', label: '2º Contato (Follow-up)', style: 'bg-purple-50 text-purple-800 border-purple-200', badge: 'bg-purple-100 text-purple-800' },
  { value: 'respondido', label: 'Respondido', style: 'bg-cyan-50 text-cyan-800 border-cyan-200', badge: 'bg-cyan-100 text-cyan-800' },
  { value: 'interessado', label: 'Interessado', style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'cliente', label: 'Cliente Fechado', style: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold', badge: 'bg-emerald-200 text-emerald-900' },
  { value: 'sem_interesse', label: 'Sem Interesse', style: 'bg-gray-100 text-gray-700 border-gray-200', badge: 'bg-gray-200 text-gray-700' },
]

const SELECT_CLASS = 'h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-tinta cursor-pointer'

function personalize(text: string, lead: SheetLead) {
  const values: Record<string, string> = {
    empresa: lead.empresa || 'sua empresa',
    cidade: lead.cidade || 'sua região',
    nicho: lead.nicho || 'seu segmento',
    catalogo: 'https://glamourlindoia.com.br/',
  }
  return text.replace(/\{\{\s*(empresa|cidade|nicho|catalogo)\s*\}\}/g, (_, key: string) => values[key] || '')
}

export type KanbanColumnKey = 'novos' | 'sem-resposta' | 'segundo-contato' | 'respondidos' | 'sem-interesse'

interface ColumnDef {
  key: KanbanColumnKey
  title: string
  subtitle: string
  icon: typeof UserRoundPlus
  targetStatus: LeadStatus
  accentColor: string
  headerBg: string
  dropBorder: string
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'novos',
    title: 'Novos Leads',
    subtitle: 'Aguardando 1º contato',
    icon: UserRoundPlus,
    targetStatus: 'novo',
    accentColor: 'text-blue-700 border-blue-300 bg-blue-50',
    headerBg: 'bg-blue-50/70 border-blue-200',
    dropBorder: 'border-blue-400 bg-blue-50/40',
  },
  {
    key: 'sem-resposta',
    title: '1º Contato Enviado',
    subtitle: 'Aguardando retorno',
    icon: Clock3,
    targetStatus: 'sem_resposta',
    accentColor: 'text-amber-700 border-amber-300 bg-amber-50',
    headerBg: 'bg-amber-50/70 border-amber-200',
    dropBorder: 'border-amber-400 bg-amber-50/40',
  },
  {
    key: 'segundo-contato',
    title: '2º Contato / Follow-up',
    subtitle: 'Tentativa de repescagem',
    icon: RotateCcw,
    targetStatus: 'segundo_contato',
    accentColor: 'text-purple-700 border-purple-300 bg-purple-50',
    headerBg: 'bg-purple-50/70 border-purple-200',
    dropBorder: 'border-purple-400 bg-purple-50/40',
  },
  {
    key: 'respondidos',
    title: 'Respondidos & Clientes',
    subtitle: 'Em negociação ou ativos',
    icon: CheckCheck,
    targetStatus: 'respondido',
    accentColor: 'text-emerald-700 border-emerald-300 bg-emerald-50',
    headerBg: 'bg-emerald-50/70 border-emerald-200',
    dropBorder: 'border-emerald-400 bg-emerald-50/40',
  },
  {
    key: 'sem-interesse',
    title: 'Sem Interesse',
    subtitle: 'Recusados / Arquivados',
    icon: Ban,
    targetStatus: 'sem_interesse',
    accentColor: 'text-gray-600 border-gray-300 bg-gray-50',
    headerBg: 'bg-gray-100/70 border-gray-200',
    dropBorder: 'border-gray-400 bg-gray-50/40',
  },
]

function getLeadColumnKey(lead: SheetLead): KanbanColumnKey {
  if (lead.status === 'novo') return 'novos'
  if (lead.status === 'sem_resposta') return 'sem-resposta'
  if (lead.status === 'segundo_contato') return 'segundo-contato'
  if (lead.status === 'sem_interesse') return 'sem-interesse'
  return 'respondidos'
}

export function LeadsPage() {
  const [leads, setLeads] = useState<SheetLead[]>([])
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Template | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null)
  const [activeDragCol, setActiveDragCol] = useState<KanbanColumnKey | null>(null)

  const location = useLocation()
  const section = location.pathname.split('/')[3] ?? 'kanban'
  const isTemplates = section === 'templates'
  const isSettings = section === 'config'

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
  const filteredLeads = leads.filter((lead) =>
    normalizeText(`${lead.empresa} ${lead.cidade} ${lead.nicho} ${lead.email} ${lead.telefone} ${lead.bairro}`).includes(term),
  )

  const selectedLead = leads.find((lead) => lead.id === selectedId) || null

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

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId)
    e.dataTransfer.setData('text/plain', String(leadId))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, colKey: KanbanColumnKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (activeDragCol !== colKey) {
      setActiveDragCol(colKey)
    }
  }

  const handleDragLeave = (_e: React.DragEvent, colKey: KanbanColumnKey) => {
    if (activeDragCol === colKey) {
      setActiveDragCol(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetCol: ColumnDef) => {
    e.preventDefault()
    setActiveDragCol(null)
    const leadIdStr = e.dataTransfer.getData('text/plain') || String(draggedLeadId)
    const leadId = Number(leadIdStr)
    if (!leadId) return

    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return

    const previousCol = getLeadColumnKey(lead)
    if (previousCol === targetCol.key) return

    const patch: Partial<SheetLead> = {
      status: targetCol.targetStatus,
      lastContact: targetCol.targetStatus === 'novo' ? lead.lastContact : 'Hoje',
    }

    updateLead(leadId, patch)
    toast.success(`"${lead.empresa}" movido para "${targetCol.title}"`)
    setDraggedLeadId(null)
  }

  const handleQuickWhatsApp = (e: React.MouseEvent, lead: SheetLead, colKey: KanbanColumnKey) => {
    e.stopPropagation()
    const phoneDigits = (lead.telefone || '').replace(/\D/g, '')
    if (!phoneDigits) {
      toast.error('Este lead não possui número de telefone/WhatsApp cadastrado.')
      return
    }

    // Determine template by stage: 2nd contact template for follow-up column, otherwise 1st presentation
    let template = templates.find((t) => t.id === (colKey === 'segundo-contato' || colKey === 'sem-resposta' ? 2 : 1))
    if (!template) {
      template = templates.find((t) => t.channel === 'whatsapp') || templates[0]
    }

    const body = template ? personalize(template.body, lead) : ''
    const fullPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(body)}`

    // Advance status smoothly if it's new
    if (lead.status === 'novo') {
      updateLead(lead.id, { status: 'sem_resposta', lastContact: 'Hoje' })
    } else if (lead.status === 'sem_resposta' && colKey === 'sem-resposta') {
      updateLead(lead.id, { lastContact: 'Hoje' })
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const closeDetail = () => setSelectedId(null)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Prospecção B2B / Atacado & CRM
          </p>
          <h1 className="text-2xl font-bold text-malva-900 tracking-tight">Leads & Pipeline Comercial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline visual arrastável (Kanban) integrado ao Google Maps, n8n e Google Sheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowScrapeModal(true)}
            className="cursor-pointer gap-2 bg-malva-700 text-white hover:bg-malva-800 shadow-sm"
          >
            <Play className="size-4" />
            Nova busca de leads (Scraping)
          </Button>
        </div>
      </div>

      {/* Sync Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Sheet className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-tinta flex items-center gap-2">
              Google Sheets <span className="font-normal text-muted-foreground text-xs">/ {getLeadsConfig().sheetName || 'Página1'}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {leads.length > 0 ? `${leads.length} leads totais na base da planilha.` : 'Sincronize com a planilha para carregar os contatos.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NavLink
            to="/admin/leads/config"
            onClick={closeDetail}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-malva-800 hover:bg-malva-50 transition-colors"
          >
            <Settings2 className="size-4" />
            Token & n8n
          </NavLink>
          <NavLink
            to="/admin/leads/templates"
            onClick={closeDetail}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-malva-800 hover:bg-malva-50 transition-colors"
          >
            <MessageCircle className="size-4" />
            Templates de Mensagens
          </NavLink>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLeads(false)}
            disabled={loadingSheet}
            className="cursor-pointer gap-2"
          >
            <RefreshCw className={`size-4 ${loadingSheet ? 'animate-spin text-malva-600' : ''}`} />
            {loadingSheet ? 'Sincronizando...' : 'Sincronizar planilha'}
          </Button>
        </div>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-malva-900">Templates de Mensagens</h2>
                <p className="text-xs text-muted-foreground">Mensagens pré-configuradas para cada etapa do funil comercial.</p>
              </div>
              <Button
                size="sm"
                className="cursor-pointer gap-1.5"
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
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {templates.map((template) => (
                <AdminCard key={template.id} className="flex flex-col justify-between">
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block rounded-md bg-malva-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-malva-800">
                          {template.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                        </span>
                        <h3 className="mt-1.5 font-semibold text-malva-900">{template.name}</h3>
                      </div>
                      <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setEditing(template)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                    </div>
                    {template.subject && <p className="mb-2 text-xs font-semibold text-tinta">{template.subject}</p>}
                    <p className="whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-muted-foreground line-clamp-6">
                      {template.body}
                    </p>
                  </div>
                </AdminCard>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-3 shadow-xs">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Buscar leads"
                className="pl-9 bg-gray-50/50 border-gray-200"
                placeholder="Buscar por empresa, nicho, cidade ou telefone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="cursor-pointer absolute right-3 top-3 text-muted-foreground hover:text-tinta"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">
                {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} encontrados
              </span>
              <div className="flex items-center rounded-xl border border-border bg-gray-50/80 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'kanban'
                      ? 'bg-white text-malva-900 shadow-xs'
                      : 'text-muted-foreground hover:text-malva-800'
                    }`}
                >
                  <LayoutGrid className="size-3.5" />
                  Quadro Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${viewMode === 'list'
                      ? 'bg-white text-malva-900 shadow-xs'
                      : 'text-muted-foreground hover:text-malva-800'
                    }`}
                >
                  <List className="size-3.5" />
                  Lista / Tabela
                </button>
              </div>
            </div>
          </div>

          {/* Kanban / Pipeline View */}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 min-h-[550px]">
              {COLUMNS.map((col) => {
                const colLeads = filteredLeads.filter((lead) => getLeadColumnKey(lead) === col.key)
                const isOver = activeDragCol === col.key
                const IconComponent = col.icon

                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={(e) => handleDragLeave(e, col.key)}
                    onDrop={(e) => handleDrop(e, col)}
                    className={`flex flex-col rounded-2xl border transition-all duration-200 bg-gray-50/60 ${isOver ? col.dropBorder + ' shadow-md ring-2 ring-malva-300' : 'border-border'
                      }`}
                  >
                    {/* Column Header */}
                    <div className={`flex items-center justify-between border-b p-3.5 rounded-t-2xl ${col.headerBg}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`grid size-7 shrink-0 place-items-center rounded-lg border bg-white ${col.accentColor}`}>
                          <IconComponent className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-malva-900 truncate leading-tight">{col.title}</h3>
                          <p className="text-[10px] text-muted-foreground truncate">{col.subtitle}</p>
                        </div>
                      </div>
                      <span className="ml-1.5 shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-tinta border border-border shadow-2xs">
                        {colLeads.length}
                      </span>
                    </div>

                    {/* Column Cards List */}
                    <div className="flex-1 p-2 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[140px]">
                      {colLeads.length === 0 ? (
                        <div className="grid place-items-center py-8 text-center text-xs text-muted-foreground/70 border-2 border-dashed border-gray-200 rounded-xl m-1">
                          <p>Nenhum lead aqui</p>
                          <p className="text-[10px] mt-0.5">Arraste um card para cá</p>
                        </div>
                      ) : (
                        colLeads.map((lead) => {
                          const initials = (lead.empresa || 'LE')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase()

                          const isSelected = selectedId === lead.id
                          const isBeingDragged = draggedLeadId === lead.id

                          return (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                              onClick={() => setSelectedId(lead.id)}
                              className={`group relative rounded-xl border bg-white p-3 shadow-2xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-malva-400 ${isSelected ? 'border-malva-600 ring-2 ring-malva-200 bg-malva-50/30' : 'border-border'
                                } ${isBeingDragged ? 'opacity-40 scale-98' : 'opacity-100'}`}
                            >
                              {/* Header & Badges */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-malva-100 font-bold text-malva-900 text-xs border border-malva-200">
                                    {initials}
                                  </span>
                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-xs text-tinta truncate group-hover:text-malva-800 transition-colors">
                                      {lead.empresa}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {lead.cidade || 'Sem cidade'}
                                    </p>
                                  </div>
                                </div>
                                <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                              </div>

                              {/* Tags & Rating */}
                              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                {lead.nicho && (
                                  <span className="rounded-md bg-malva-50 border border-malva-100 px-1.5 py-0.5 text-[10px] font-medium text-malva-800 truncate max-w-[120px]">
                                    {lead.nicho}
                                  </span>
                                )}
                                {lead.avaliacao && (
                                  <span className="flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                    <Star className="size-2.5 fill-amber-400 text-amber-500" />
                                    {lead.avaliacao}
                                  </span>
                                )}
                              </div>

                              {/* Action Footer */}
                              <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                                <div className="flex items-center gap-1">
                                  {lead.telefone ? (
                                    <button
                                      type="button"
                                      title="Enviar abordagem no WhatsApp"
                                      onClick={(e) => handleQuickWhatsApp(e, lead, col.key)}
                                      className="cursor-pointer grid size-6 place-items-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-200"
                                    >
                                      <MessageCircle className="size-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">Sem whats</span>
                                  )}
                                  {lead.googleMaps && (
                                    <a
                                      href={lead.googleMaps}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Ver no Google Maps"
                                      onClick={(e) => e.stopPropagation()}
                                      className="cursor-pointer grid size-6 place-items-center rounded-lg bg-gray-50 text-muted-foreground hover:bg-malva-50 hover:text-malva-700 transition-colors border border-gray-200"
                                    >
                                      <MapPin className="size-3.5" />
                                    </a>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedId(lead.id)
                                  }}
                                  className="cursor-pointer flex items-center gap-0.5 text-[11px] font-semibold text-malva-700 hover:text-malva-900 transition-colors"
                                >
                                  Detalhes
                                  <ArrowUpRight className="size-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List / Table View */
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_100px] gap-4 border-b border-border bg-malva-50/50 px-5 py-3 text-xs font-semibold text-muted-foreground lg:grid">
                <span>Empresa & Nicho</span>
                <span>Contatos</span>
                <span>Etapa Atual</span>
                <span className="text-right">Ação</span>
              </div>
              <ul className="divide-y divide-border">
                {filteredLeads.length === 0 ? (
                  <li className="p-8 text-center">
                    <EmptyState>Nenhum lead encontrado com a busca atual.</EmptyState>
                  </li>
                ) : (
                  filteredLeads.map((lead) => {
                    const statusObj = STATUSES.find((s) => s.value === lead.status) || STATUSES[0]
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
                          onClick={() => setSelectedId(lead.id)}
                          className={`cursor-pointer grid w-full items-center gap-3 px-5 py-4 text-left transition-colors lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_100px] lg:gap-4 ${selectedId === lead.id ? 'bg-malva-50/80' : 'hover:bg-malva-50/40'
                            }`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-malva-100 font-bold text-malva-900 text-xs border border-malva-200">
                              {initials}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-tinta truncate">{lead.empresa}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lead.nicho && <span className="text-xs text-malva-700 font-medium">{lead.nicho}</span>}
                                <span className="text-xs text-muted-foreground">· {lead.cidade || 'Sem cidade'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
                            {lead.telefone && (
                              <p className="flex items-center gap-1.5 font-medium text-emerald-800">
                                <Phone className="size-3.5 shrink-0 text-emerald-600" />
                                {lead.telefone}
                              </p>
                            )}
                            {lead.email && (
                              <p className="flex items-center gap-1.5 truncate">
                                <Mail className="size-3.5 shrink-0 text-malva-600" />
                                <span className="truncate">{lead.email}</span>
                              </p>
                            )}
                          </div>

                          <div>
                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusObj.style}`}>
                              {statusObj.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-end">
                            <span className="flex items-center gap-1 text-xs font-semibold text-malva-700">
                              Ver ficha
                              <ArrowUpRight className="size-3.5" />
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Side Drawer / Modal Preview for Selected Lead */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto border-l border-border animate-in slide-in-from-right duration-200">
            <LeadPreview
              key={selectedLead.id}
              lead={selectedLead}
              templates={templates}
              onClose={closeDetail}
              onUpdate={(patch) => updateLead(selectedLead.id, patch)}
            />
          </div>
        </div>
      )}

      {/* Scraping Modal */}
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
      const nextStatus = lead.status === 'novo' ? 'sem_resposta' : lead.status
      onUpdate({ status: nextStatus, lastContact: 'Hoje' })
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    } else if (channel === 'email' && mailtoUrl) {
      const nextStatus = lead.status === 'novo' ? 'sem_resposta' : lead.status
      onUpdate({ status: nextStatus, lastContact: 'Hoje' })
      window.open(mailtoUrl, '_blank')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <span className="inline-block rounded-md bg-malva-100 border border-malva-200 px-2 py-0.5 text-xs font-semibold text-malva-900 mb-1.5">
            {lead.nicho || 'Geral'}
          </span>
          <h2 className="text-xl font-bold text-malva-900 leading-tight">{lead.empresa}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lead.cidade} {lead.bairro ? `· ${lead.bairro}` : ''}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar detalhes"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-malva-50 hover:text-tinta transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Stage Fast Selector */}
      <div>
        <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider mb-2">
          Etapa do Funil / Status
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onUpdate({ status: item.value })}
              className={`cursor-pointer rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all text-center ${lead.status === item.value
                  ? 'border-malva-600 bg-malva-700 text-white shadow-xs'
                  : 'border-border bg-white text-tinta hover:bg-malva-50'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details List */}
      <div className="rounded-xl border border-border bg-gray-50/50 p-4 space-y-3 text-xs">
        {lead.endereco && (
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-malva-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground">Endereço</p>
              <p className="font-medium text-tinta">{lead.endereco}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Phone className="size-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-muted-foreground">Telefone</p>
            <p className="font-medium text-tinta">{lead.telefone || 'Não informado'}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Mail className="size-4 text-malva-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-muted-foreground">E-mail</p>
            <p className="font-medium text-tinta break-all">{lead.email || 'Não informado'}</p>
          </div>
        </div>

        {lead.avaliacao && (
          <div className="flex items-start gap-2">
            <Star className="size-4 fill-amber-400 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground">Avaliação no Google Maps</p>
              <p className="font-medium text-tinta">
                {lead.avaliacao} ({lead.avaliacoes || '0'} avaliações)
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {lead.googleMaps && (
            <a
              href={lead.googleMaps}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-malva-700 hover:bg-malva-50 transition-colors"
            >
              <MapPin className="size-3.5" />
              Ver no Google Maps
              <ExternalLink className="size-3" />
            </a>
          )}
          {lead.instagram && (
            <a
              href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-pink-700 hover:bg-pink-50 transition-colors"
            >
              <span className="font-bold">@</span>
              Instagram
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>

      {/* Internal Notes */}
      <div>
        <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
          Anotações do Lead
        </label>
        <Textarea
          className="mt-1.5 text-xs"
          placeholder="Ex.: Gostou do mostruário, retorno combinado para 15h, prefere falar por WhatsApp..."
          value={lead.notes}
          onChange={(event) => onUpdate({ notes: event.target.value })}
        />
      </div>

      {/* Outreach / Message Composer */}
      {lead.status === 'sem_interesse' ? (
        <div className="rounded-xl bg-gray-100 p-4 border border-gray-200">
          <p className="text-xs font-bold text-gray-800">Contato Arquivado / Sem Interesse</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Este lead foi descartado ou recusou o contato. Caso mude de ideia, basta mover para outra etapa acima.
          </p>
        </div>
      ) : (
        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="font-bold text-sm text-malva-900">Enviar Mensagem</h3>

          <div className="flex gap-2">
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

          <div>
            <label className="block text-xs font-medium text-malva-900 mb-1">
              Modelo de Template
            </label>
            <select
              className={SELECT_CLASS}
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
          </div>

          {channel === 'email' && template && (
            <div className="rounded-lg bg-malva-50 p-2.5 text-xs border border-malva-200">
              <span className="font-bold text-malva-900">Assunto: </span>
              <span>{personalize(template.subject || emailSubject, lead)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-malva-900 mb-1">
              Mensagem Personalizada
            </label>
            <Textarea
              className="min-h-36 text-xs leading-relaxed"
              value={body}
              onChange={(event) => setCustomBody(event.target.value)}
            />
          </div>

          <Button
            className="cursor-pointer w-full gap-2 text-white bg-emerald-600 hover:bg-emerald-700"
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
    </div>
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
      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer mb-4 flex items-center gap-1 text-sm font-semibold text-malva-700 hover:text-malva-900 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Voltar aos templates
      </button>
      <h3 className="mb-4 font-bold text-lg text-malva-900">{template.name ? 'Editar template' : 'Novo template'}</h3>

      <div className="space-y-4">
        <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
          Nome do template
          <Input
            className="mt-1.5"
            value={draft.name}
            placeholder="Ex.: 2º Contato / Follow-up"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>

        <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
          Canal
          <select
            className={`${SELECT_CLASS} mt-1.5`}
            value={draft.channel}
            onChange={(event) => setDraft({ ...draft, channel: event.target.value as Channel })}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </select>
        </label>

        {draft.channel === 'email' && (
          <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
            Assunto do e-mail
            <Input
              className="mt-1.5"
              value={draft.subject}
              onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
            />
          </label>
        )}

        <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
          Conteúdo da mensagem
          <Textarea
            className="mt-1.5 min-h-52 font-normal leading-relaxed text-xs"
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Tags disponíveis:{' '}
          <code className="rounded bg-malva-100 px-1 py-0.5 text-malva-900 font-semibold">{'{{empresa}}'}</code>,{' '}
          <code className="rounded bg-malva-100 px-1 py-0.5 text-malva-900 font-semibold">{'{{cidade}}'}</code>,{' '}
          <code className="rounded bg-malva-100 px-1 py-0.5 text-malva-900 font-semibold">{'{{nicho}}'}</code> e{' '}
          <code className="rounded bg-malva-100 px-1 py-0.5 text-malva-900 font-semibold">{'{{catalogo}}'}</code>.
        </p>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onSave(draft)}
            className="cursor-pointer gap-2 bg-malva-700 hover:bg-malva-800 text-white"
            disabled={!draft.name.trim() || !draft.body.trim()}
          >
            <Check className="size-4" />
            Salvar template
          </Button>
          <Button variant="outline" onClick={onCancel} className="cursor-pointer">
            Cancelar
          </Button>
        </div>
      </div>
    </AdminCard>
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
            <h3 className="font-bold text-malva-900">Buscar novos leads (Google Maps / Apify)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-tinta"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleStartScraping} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
              Nicho / Ramo de Atuação <span className="text-red-500">*</span>
            </label>
            <Input
              className="mt-1.5"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              placeholder="Ex.: joalheria, ótica, boutique, loja de semijoias"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider col-span-3">
              Tipo de Localização
            </label>
            {(['CIDADE', 'BAIRRO', 'CEP'] as const).map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => setTipoLocalizacao(tipo)}
                className={`cursor-pointer rounded-xl border py-2 text-xs font-semibold transition-colors ${tipoLocalizacao === tipo
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
                <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1.5"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Porto Alegre"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">Estado (UF)</label>
                <Input
                  className="mt-1.5"
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
              <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
                Bairro <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1.5"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex.: Moinhos de Vento"
                required
              />
            </div>
          )}

          {tipoLocalizacao === 'CEP' && (
            <div>
              <label className="block text-xs font-bold text-malva-900 uppercase tracking-wider">
                CEP (8 dígitos) <span className="text-red-500">*</span>
              </label>
              <Input
                className="mt-1.5"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="90000-000"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Limite de busca no Maps
              </label>
              <Input
                className="mt-1.5"
                type="number"
                min={5}
                max={500}
                value={limiteBusca}
                onChange={(e) => setLimiteBusca(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Limite max. para salvar
              </label>
              <Input
                className="mt-1.5"
                type="number"
                min={5}
                max={500}
                value={limiteSalvar}
                onChange={(e) => setLimiteSalvar(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Token Apify (opcional se já salvo nas configurações)
            </label>
            <Input
              className="mt-1.5"
              type="password"
              value={apifyToken}
              onChange={(e) => setApifyToken(e.target.value)}
              placeholder="apify_api_..."
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="cursor-pointer">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="cursor-pointer gap-2 bg-malva-700 hover:bg-malva-800 text-white"
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
