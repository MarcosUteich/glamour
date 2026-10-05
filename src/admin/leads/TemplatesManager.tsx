import { ArrowLeft, Check, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AdminCard } from '../ui'
import { SELECT_CLASS, type Channel, type Template } from './types'

interface TemplatesManagerProps {
  templates: Template[]
  onUpdateTemplates: (updater: (prev: Template[]) => Template[]) => void
}

export function TemplatesManager({ templates, onUpdateTemplates }: TemplatesManagerProps) {
  const [editing, setEditing] = useState<Template | null>(null)

  if (editing) {
    return (
      <TemplateEditor
        key={editing.id}
        template={editing}
        onCancel={() => setEditing(null)}
        onSave={(updated) => {
          onUpdateTemplates((prev) => {
            const exists = prev.some((t) => t.id === updated.id)
            if (exists) return prev.map((t) => (t.id === updated.id ? updated : t))
            return [...prev, updated]
          })
          setEditing(null)
          toast.success('Template salvo com sucesso!')
        }}
      />
    )
  }

  return (
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
