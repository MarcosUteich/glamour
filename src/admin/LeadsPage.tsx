import { Mail, Search, MessageCircle, ArrowLeft, Pencil, Check, Sheet, ArrowUpRight, X, RefreshCw, Clock3, CheckCheck, UserRoundPlus, Ban, Settings2 } from 'lucide-react'
import { LeadScrapingSettings } from './LeadScrapingSettings'
import { NavLink, useLocation } from 'react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { normalizeText } from '@/lib/slug'
import { AdminCard, EmptyState, FilterChip } from './ui'

type Status = 'novo' | 'sem_resposta' | 'respondido' | 'interessado' | 'cliente' | 'sem_interesse'
type Channel = 'whatsapp' | 'email'
type Lead = { id: number; company: string; niche: string; city: string; neighborhood: string; phone: string; email: string; status: Status; notes: string; leadKey: string; lastContact: string }
type Template = { id: number; name: string; channel: Channel; subject: string; body: string }
const STATUSES: { value: Status; label: string; style: string }[] = [
  { value: 'novo', label: 'Novo', style: 'bg-malva-100 text-malva-800' },
  { value: 'sem_resposta', label: 'Sem resposta', style: 'bg-amber-50 text-amber-800' },
  { value: 'respondido', label: 'Respondido', style: 'bg-blue-50 text-blue-700' },
  { value: 'interessado', label: 'Interessado', style: 'bg-amber-50 text-amber-800' },
  { value: 'cliente', label: 'Cliente', style: 'bg-ok-fundo text-ok' },
  { value: 'sem_interesse', label: 'Sem interesse', style: 'bg-gray-100 text-gray-600' },
]
const SELECT_CLASS = 'h-11 w-full rounded-xl border border-input bg-white px-3 text-sm text-tinta'
function personalize(text: string, lead: Lead) {
  const values: Record<string, string> = { empresa: lead.company, cidade: lead.city, nicho: lead.niche, catalogo: 'https://glamourlindoia.com.br/' }
  return text.replace(/\{\{\s*(empresa|cidade|nicho|catalogo)\s*\}\}/g, (_, key: string) => values[key])
}

type Queue = 'novos' | 'sem-resposta' | 'respondidos' | 'sem-interesse'
const QUEUES = [
  { key: 'novos' as const, title: 'Novos leads', description: 'Contatos da planilha que ainda não receberam uma abordagem.', icon: UserRoundPlus },
  { key: 'sem-resposta' as const, title: 'Sem resposta', description: 'Contatos já abordados que ainda não retornaram.', icon: Clock3 },
  { key: 'respondidos' as const, title: 'Respondidos', description: 'Conversas em andamento, interessados e clientes.', icon: CheckCheck },
  { key: 'sem-interesse' as const, title: 'Sem interesse', description: 'Histórico de contatos que recusaram a proposta. Fora da fila de abordagem.', icon: Ban },
]
function inQueue(lead: Lead, queue: Queue) {
  if (queue === 'novos') return lead.status === 'novo'
  if (queue === 'sem-resposta') return lead.status === 'sem_resposta'
  if (queue === 'sem-interesse') return lead.status === 'sem_interesse'
  return ['respondido', 'interessado', 'cliente'].includes(lead.status)
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [templates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Template | null>(null)
  const location = useLocation()
  const section = location.pathname.split('/')[3] ?? 'novos'
  const isTemplates = section === 'templates'
  const isSettings = section === 'config'
  const queue = QUEUES.find((item) => item.key === section) ?? QUEUES[0]
  const term = normalizeText(search)
  const filtered = leads.filter((lead) => inQueue(lead, queue.key)
    && normalizeText(`${lead.company} ${lead.city} ${lead.niche} ${lead.email} ${lead.phone}`).includes(term))
  const selected = filtered.find((lead) => lead.id === selectedId)
  const update = (id: number, patch: Partial<Lead>) => setLeads((items) => items.map((lead) => lead.id === id ? { ...lead, ...patch } : lead))
  const closeDetail = () => setSelectedId(null)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prospecção de atacado</p>
          <h1 className="text-2xl font-semibold text-malva-800">Leads e contatos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Da planilha à conversa com sua próxima loja parceira.</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Sheet className="size-6" /></div>
          <div><p className="font-semibold text-tinta">Google Sheets <span className="font-normal text-muted-foreground">/ Página1</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Sua planilha de leads será a origem dos contatos.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NavLink to="/admin/leads/config" onClick={closeDetail} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-malva-800 hover:bg-malva-50"><Settings2 className="size-4" />Token da Apify</NavLink>
          <Button variant="outline" size="sm" disabled><RefreshCw className="size-4" />Sincronizar planilha</Button>
        </div>
      </div>

      <nav aria-label="Etapas dos leads" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {QUEUES.map((item) => (
          <NavLink key={item.key} to={item.key === 'novos' ? '/admin/leads' : `/admin/leads/${item.key}`} end onClick={closeDetail}
            className={`rounded-2xl border p-4 transition-colors ${!isTemplates && !isSettings && queue.key === item.key ? 'border-malva-500 bg-malva-700 text-white shadow-sm' : 'border-border bg-white text-malva-800 hover:border-malva-300'}`}>
            <div className="flex items-center justify-between gap-2"><item.icon className="size-4 opacity-75" /><span className="text-2xl font-semibold tabular-nums">{leads.filter((lead) => inQueue(lead, item.key)).length}</span></div>
            <p className="mt-3 text-sm font-semibold">{item.title}</p>
          </NavLink>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-malva-800">{isSettings ? 'Token da Apify' : isTemplates ? 'Templates de mensagens' : queue.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{isSettings ? 'Defina ou substitua o token usado na busca de leads.' : isTemplates ? 'Prepare uma abordagem para cada etapa da conversa.' : queue.description}</p>
        </div>
        {isSettings ? null : isTemplates ? <Button size="sm" onClick={() => setEditing({ id: 0, name: '', channel: 'whatsapp', subject: '', body: '' })}>Novo template</Button>
          : <NavLink to="/admin/leads/templates" onClick={closeDetail} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-malva-800 hover:bg-malva-50"><MessageCircle className="size-4" />Templates<ArrowUpRight className="size-4" /></NavLink>}
      </div>

      {isSettings ? <LeadScrapingSettings /> : isTemplates ? (
        editing ? <TemplateEditor key={editing.id} template={editing} onCancel={() => setEditing(null)} /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.length === 0 && <div className="lg:col-span-2"><EmptyState>Nenhum template cadastrado.</EmptyState></div>}
            {templates.map((template) => (
              <AdminCard key={template.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{template.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</p><h3 className="font-semibold text-malva-800">{template.name}</h3></div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(template)}><Pencil className="size-3.5" />Editar</Button>
                </div>
                {template.subject && <p className="mb-2 text-sm font-medium text-tinta">{template.subject}</p>}
                <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-muted-foreground">{template.body}</p>
              </AdminCard>
            ))}
          </div>
        )
      ) : (
        <div className={`grid items-start gap-5 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white">
            <div className="border-b border-border p-4">
              <div className="relative"><Search className="absolute left-3 top-4 size-4 text-muted-foreground" /><Input aria-label="Buscar leads" className="pl-9" placeholder="Buscar empresa, nicho ou contato…" value={search} onChange={(event) => { setSearch(event.target.value); closeDetail() }} /></div>
            </div>
            {filtered.length === 0 ? <div className="p-4"><EmptyState>Nenhum lead nesta fila com os filtros escolhidos.</EmptyState></div> : (
              <>
                <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_100px] gap-4 border-b border-border bg-malva-50/50 px-5 py-3 text-xs font-medium text-muted-foreground lg:grid"><span>Empresa / localização</span><span>Contato</span><span>{queue.key === 'novos' ? 'Status' : 'Último contato'}</span><span className="text-right">Detalhes</span></div>
                <ul className="divide-y divide-border">
                  {filtered.map((lead) => {
                    const state = STATUSES.find((item) => item.value === lead.status)!
                    return (
                      <li key={lead.id}>
                        <button type="button" aria-pressed={selectedId === lead.id} onClick={() => setSelectedId(lead.id)}
                          className={`grid w-full items-center gap-3 px-5 py-5 text-left transition-colors lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_100px] lg:gap-4 ${selectedId === lead.id ? 'bg-malva-50' : 'hover:bg-malva-50/50'}`}>
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-malva-100 bg-malva-50 font-semibold text-malva-700">{lead.company.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span>
                            <div className="min-w-0"><p className="wrap-break-word font-semibold text-tinta">{lead.company}</p><p className="mt-1 text-xs text-muted-foreground">{lead.niche}</p><p className="mt-1 text-xs text-muted-foreground">{lead.city} · {lead.neighborhood}</p></div>
                          </div>
                          <div className="min-w-0 space-y-2 text-xs text-muted-foreground">
                            {lead.phone && <p className="flex items-center gap-2"><MessageCircle className="size-3.5 shrink-0 text-emerald-700" />{lead.phone}</p>}
                            {lead.email && <p className="flex items-center gap-2"><Mail className="size-3.5 shrink-0" /><span className="truncate">{lead.email}</span></p>}
                          </div>
                          <div>{queue.key === 'novos' ? <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${state.style}`}>{state.label}</span>
                            : <><p className="text-xs text-muted-foreground">{lead.lastContact}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${state.style}`}>{state.label}</span></>}</div>
                          <span className="flex items-center gap-1 text-xs font-semibold text-malva-700 lg:justify-end">Ver lead<ArrowUpRight className="size-3.5" /></span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'lead nesta página' : 'leads nesta página'}</div>
          </div>
          {selected && <LeadPreview key={selected.id} lead={selected} templates={templates} onClose={closeDetail} onUpdate={(patch) => update(selected.id, patch)} />}
        </div>
      )}

    </div>
  )
}

function LeadPreview({ lead, templates, onUpdate, onClose }: { lead: Lead; templates: Template[]; onUpdate: (patch: Partial<Lead>) => void; onClose: () => void }) {
  const [channel, setChannel] = useState<Channel>(lead.phone ? 'whatsapp' : 'email')
  const available = templates.filter((template) => template.channel === channel)
  const [templateId, setTemplateId] = useState(available[0]?.id ?? 0)
  const [customBody, setCustomBody] = useState<string | null>(null)
  const template = available.find((item) => item.id === templateId) ?? available[0]
  const body = customBody ?? (template ? personalize(template.body, lead) : '')
  return (
    <AdminCard className="min-w-0 xl:sticky xl:top-5">
      <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold text-malva-800">{lead.company}</h2><button type="button" aria-label="Fechar detalhes" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-malva-50"><X className="size-5" /></button></div>
      <p className="mt-1 text-sm text-muted-foreground">{lead.niche} · {lead.city}</p>
      <dl className="my-4 space-y-2 border-y border-border py-4 text-sm"><div><dt className="text-xs text-muted-foreground">Localização</dt><dd>{lead.neighborhood}, {lead.city}</dd></div><div><dt className="text-xs text-muted-foreground">Telefone</dt><dd>{lead.phone || 'Não informado'}</dd></div><div><dt className="text-xs text-muted-foreground">E-mail</dt><dd className="break-all">{lead.email || 'Não informado'}</dd></div></dl>
      <label className="block text-sm font-medium text-malva-800">Status do lead<select className={`${SELECT_CLASS} mt-2`} value={lead.status} onChange={(event) => onUpdate({ status: event.target.value as Status })}>{STATUSES.map((item) => <option key={item.value} value={item.value} disabled={item.value === 'novo' && lead.status !== 'novo'}>{item.label}</option>)}</select></label>
      <label className="mt-4 block text-sm font-medium text-malva-800">Anotações<Textarea className="mt-2" placeholder="Ex.: pediu catálogo, retornar na sexta…" value={lead.notes} onChange={(event) => onUpdate({ notes: event.target.value })} /></label>
      {lead.status === 'sem_interesse' ? <div className="mt-5 rounded-xl bg-gray-50 p-4"><p className="text-sm font-semibold text-tinta">Contato encerrado</p><p className="mt-1 text-xs text-muted-foreground">Este lead não será incluído em novas abordagens. Mantenha aqui o motivo e o histórico da conversa.</p></div> : <div className="mt-5 border-t border-border pt-5"><h3 className="mb-3 font-semibold text-malva-800">Preparar contato</h3><div className="mb-3 flex gap-2">{(['whatsapp', 'email'] as const).map((value) => <FilterChip key={value} active={channel === value} onClick={() => { setChannel(value); setTemplateId(templates.find((item) => item.channel === value)?.id ?? 0); setCustomBody(null) }}>{value === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</FilterChip>)}</div>
        <label className="block text-sm font-medium text-malva-800">Template<select className={`${SELECT_CLASS} mt-2`} value={template?.id ?? ''} onChange={(event) => { setTemplateId(Number(event.target.value)); setCustomBody(null) }}>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {channel === 'email' && template && <div className="mt-3 rounded-lg bg-malva-50 p-3 text-sm"><span className="text-xs text-muted-foreground">Assunto</span><p className="mt-1 font-medium">{personalize(template.subject, lead)}</p></div>}
        <label className="mt-3 block text-sm font-medium text-malva-800">Prévia da mensagem<Textarea className="mt-2 min-h-48 text-sm leading-relaxed" value={body} onChange={(event) => setCustomBody(event.target.value)} /></label>
        <Button className="mt-4 w-full" variant={channel === 'whatsapp' ? 'whatsapp' : 'default'} disabled>{channel === 'whatsapp' ? <MessageCircle className="size-4" /> : <Mail className="size-4" />}{channel === 'whatsapp' ? 'Abrir no WhatsApp' : 'Preparar e-mail'}</Button>
        <p className="mt-2 text-xs text-muted-foreground">Envio indisponível até conectar o serviço de mensagens.</p>
      </div>}
    </AdminCard>
  )
}

function TemplateEditor({ template, onCancel }: { template: Template; onCancel: () => void }) {
  const [draft, setDraft] = useState(template)
  return <AdminCard className="max-w-3xl"><button type="button" onClick={onCancel} className="mb-4 flex items-center gap-1 text-sm text-malva-700"><ArrowLeft className="size-4" />Voltar aos templates</button><h3 className="mb-4 font-semibold text-malva-800">{template.id ? 'Editar template' : 'Novo template'}</h3><div className="space-y-4"><label className="block text-sm font-medium">Nome<Input className="mt-2" value={draft.name} placeholder="Ex.: primeiro contato" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label className="block text-sm font-medium">Canal<select className={`${SELECT_CLASS} mt-2`} value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Channel })}><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select></label>{draft.channel === 'email' && <label className="block text-sm font-medium">Assunto<Input className="mt-2" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label>}<label className="block text-sm font-medium">Mensagem<Textarea className="mt-2 min-h-56" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><p className="text-xs text-muted-foreground">Variáveis disponíveis: {'{{empresa}}, {{cidade}}, {{nicho}} e {{catalogo}}'}.</p><div className="flex gap-2"><Button disabled><Check className="size-4" />Salvar template</Button><Button variant="outline" onClick={onCancel}>Cancelar</Button></div></div></AdminCard>
}
