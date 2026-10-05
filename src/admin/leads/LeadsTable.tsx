import { ArrowUpRight, Mail, Phone } from 'lucide-react'
import type { SheetLead } from '../leads-config'
import { EmptyState } from '../ui'
import { STATUSES } from './types'

interface LeadsTableProps {
  leads: SheetLead[]
  selectedId: number | null
  onSelectLead: (id: number) => void
}

export function LeadsTable({ leads, selectedId, onSelectLead }: LeadsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_100px] gap-4 border-b border-border bg-malva-50/50 px-5 py-3 text-xs font-semibold text-muted-foreground lg:grid">
        <span>Empresa & Nicho</span>
        <span>Contatos</span>
        <span>Etapa Atual</span>
        <span className="text-right">Ação</span>
      </div>
      <ul className="divide-y divide-border">
        {leads.length === 0 ? (
          <li className="p-8 text-center">
            <EmptyState>Nenhum lead encontrado com a busca atual.</EmptyState>
          </li>
        ) : (
          leads.map((lead) => {
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
                  onClick={() => onSelectLead(lead.id)}
                  className={`cursor-pointer grid w-full items-center gap-3 px-5 py-4 text-left transition-colors lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_100px] lg:gap-4 ${
                    selectedId === lead.id ? 'bg-malva-50/80' : 'hover:bg-malva-50/40'
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
  )
}
