import {
  LayoutGrid,
  List,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Sheet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeText } from '@/lib/slug'
import { LeadScrapingSettings } from './LeadScrapingSettings'
import { KanbanBoard } from './leads/KanbanBoard'
import { LeadPreview } from './leads/LeadPreview'
import { LeadsTable } from './leads/LeadsTable'
import { ScrapingModal } from './leads/ScrapingModal'
import { TemplatesManager } from './leads/TemplatesManager'
import { DEFAULT_TEMPLATES, type Template } from './leads/types'
import {
  fetchLeadsFromSheet,
  getLeadsConfig,
  triggerN8nUpdateLead,
  type SheetLead,
} from './leads-config'

export function LeadsPage() {
  const [leads, setLeads] = useState<SheetLead[]>([])
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

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

  const pendingRef = useRef<Map<string, SheetLead>>(new Map())
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastId = useRef<string | number | null>(null)

  const flushPending = useCallback(async () => {
    const entries = Array.from(pendingRef.current.values())
    if (entries.length === 0) return
    pendingRef.current.clear()

    toastId.current = toast.loading(`Salvando ${entries.length > 1 ? `${entries.length} leads` : '1 lead'}…`)
    try {
      await Promise.all(entries.map((lead) => triggerN8nUpdateLead(lead, {})))
      toast.success('Salvo no Google Sheets ✓', { id: toastId.current })
    } catch (err) {
      toast.error('Erro ao salvar no Sheets. Verifique o n8n.', { id: toastId.current })
      console.warn('Erro ao sincronizar com Google Sheets via n8n:', err)
    }
  }, [])

  const updateLead = (id: number, patch: Partial<SheetLead>) => {
    setLeads((items) =>
      items.map((lead) => {
        if (lead.id === id) {
          const updated = { ...lead, ...patch }
          pendingRef.current.set(updated.leadKey, updated)
          return updated
        }
        return lead
      }),
    )

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(flushPending, 2500)
  }

  const closeDetail = () => setSelectedId(null)

  return (
    <div className="space-y-6">
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
        <TemplatesManager templates={templates} onUpdateTemplates={setTemplates} />
      ) : (
        <div className="space-y-4">
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
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    viewMode === 'kanban'
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
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    viewMode === 'list'
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

          {viewMode === 'kanban' ? (
            <KanbanBoard
              leads={filteredLeads}
              templates={templates}
              selectedId={selectedId}
              onSelectLead={setSelectedId}
              onUpdateLead={updateLead}
            />
          ) : (
            <LeadsTable
              leads={filteredLeads}
              selectedId={selectedId}
              onSelectLead={setSelectedId}
            />
          )}
        </div>
      )}

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
