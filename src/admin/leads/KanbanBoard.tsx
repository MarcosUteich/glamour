import {
  GripVertical,
  MapPin,
  MessageCircle,
  Star,
  ArrowUpRight,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { SheetLead } from '../leads-config'
import {
  COLUMNS,
  getLeadColumnKey,
  personalize,
  type ColumnDef,
  type KanbanColumnKey,
  type Template,
} from './types'

interface KanbanBoardProps {
  leads: SheetLead[]
  templates: Template[]
  selectedId: number | null
  onSelectLead: (id: number) => void
  onUpdateLead: (id: number, patch: Partial<SheetLead>) => void
}

export function KanbanBoard({
  leads,
  templates,
  selectedId,
  onSelectLead,
  onUpdateLead,
}: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null)
  const [activeDragCol, setActiveDragCol] = useState<KanbanColumnKey | null>(null)

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

    onUpdateLead(leadId, patch)
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

    let template = templates.find((t) => t.id === (colKey === 'segundo-contato' || colKey === 'sem-resposta' ? 2 : 1))
    if (!template) {
      template = templates.find((t) => t.channel === 'whatsapp') || templates[0]
    }

    const body = template ? personalize(template.body, lead) : ''
    const fullPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(body)}`

    if (lead.status === 'novo') {
      onUpdateLead(lead.id, { status: 'sem_resposta', lastContact: 'Hoje' })
    } else if (lead.status === 'sem_resposta' && colKey === 'sem-resposta') {
      onUpdateLead(lead.id, { lastContact: 'Hoje' })
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 min-h-[550px]">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((lead) => getLeadColumnKey(lead) === col.key)
        const isOver = activeDragCol === col.key
        const IconComponent = col.icon

        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={(e) => handleDragLeave(e, col.key)}
            onDrop={(e) => handleDrop(e, col)}
            className={`flex flex-col rounded-2xl border transition-all duration-200 bg-gray-50/60 ${
              isOver ? col.dropBorder + ' shadow-md ring-2 ring-malva-300' : 'border-border'
            }`}
          >
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
                      onClick={() => onSelectLead(lead.id)}
                      className={`group relative rounded-xl border bg-white p-3 shadow-2xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-malva-400 ${
                        isSelected ? 'border-malva-600 ring-2 ring-malva-200 bg-malva-50/30' : 'border-border'
                      } ${isBeingDragged ? 'opacity-40 scale-98' : 'opacity-100'}`}
                    >
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
                            onSelectLead(lead.id)
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
  )
}
