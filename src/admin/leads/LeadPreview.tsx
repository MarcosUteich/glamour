import {
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { SheetLead } from '../leads-config'
import { FilterChip } from '../ui'
import {
  personalize,
  SELECT_CLASS,
  STATUSES,
  type Channel,
  type Template,
} from './types'

interface LeadPreviewProps {
  lead: SheetLead
  templates: Template[]
  onUpdate: (patch: Partial<SheetLead>) => void
  onClose: () => void
}

export function LeadPreview({
  lead,
  templates,
  onUpdate,
  onClose,
}: LeadPreviewProps) {
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
              className={`cursor-pointer rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all text-center ${
                lead.status === item.value
                  ? 'border-malva-600 bg-malva-700 text-white shadow-xs'
                  : 'border-border bg-white text-tinta hover:bg-malva-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

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
