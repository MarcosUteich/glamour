import { Check, KeyRound, Sheet, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AdminCard } from './ui'
import { getLeadsConfig, saveLeadsConfig, type LeadScrapingConfig } from './leads-config'

export function LeadScrapingSettings() {
  const [config, setConfig] = useState<LeadScrapingConfig>(getLeadsConfig())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveLeadsConfig(config)
    setSaved(true)
    toast.success('Configurações de integração salvas com sucesso!')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <AdminCard className="max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-malva-800">
            <KeyRound className="size-4" />
            Integração de leads com n8n
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure as conexões para disparar o scraping pelo n8n e salvar automaticamente na sua planilha do Google Sheets.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-malva-800">
            <span>Token da Apify</span>
            <Input className="mt-2" type="password" autoComplete="off" spellCheck={false}
              value={config.apifyToken}
              onChange={(event) => setConfig({ ...config, apifyToken: event.target.value })}
              placeholder="apify_api_..." />
            <p className="mt-1 text-xs text-muted-foreground">
              Salvo neste navegador e enviado ao n8n somente ao iniciar uma busca. Para trocar, substitua o valor e salve.
            </p>
          </label>

          <label className="block text-sm font-medium text-malva-800">
            <div className="flex items-center justify-between">
              <span>URL do Webhook de Busca (Scraping) n8n</span>
            </div>
            <Input
              className="mt-2"
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={config.n8nWebhookUrl}
              onChange={(event) => setConfig({ ...config, n8nWebhookUrl: event.target.value })}
              placeholder="https://n8n.glamourlindoia.com.br/webhook/leads-scraping"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              O webhook no seu n8n que recebe os parâmetros de busca enviados pelo painel.
            </p>
          </label>

          <label className="block text-sm font-medium text-malva-800">
            <div className="flex items-center justify-between">
              <span>URL do Webhook de Atualização (Google Sheets) n8n</span>
            </div>
            <Input
              className="mt-2"
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={config.n8nUpdateWebhookUrl || ''}
              onChange={(event) => setConfig({ ...config, n8nUpdateWebhookUrl: event.target.value })}
              placeholder="https://n8n.glamourlindoia.com.br/webhook/leads-update"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              O webhook que atualiza o status, anotações e data de contato diretamente na sua planilha.
            </p>
          </label>

          <label className="block text-sm font-medium text-malva-800">
            <span>URL do Webhook de Leitura n8n</span>
            <Input className="mt-2" type="url" value={config.n8nReadWebhookUrl}
              onChange={(event) => setConfig({ ...config, n8nReadWebhookUrl: event.target.value })}
              placeholder="https://n8n.glamourlindoia.com.br/webhook/leads-read" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-malva-800">
              <div className="flex items-center justify-between">
                <span>ID da Planilha (Google Sheets)</span>
                {config.sheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${config.sheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                  >
                    Abrir planilha <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Input
                className="mt-2"
                value={config.sheetId}
                onChange={(event) => setConfig({ ...config, sheetId: event.target.value })}
                placeholder="1ARtBNXi9JHnK7fzSeectXe8K_aEyGA1iyXnqOzieJsw"
              />
            </label>

            <label className="block text-sm font-medium text-malva-800">
              <span>Nome da Aba / Página</span>
              <Input
                className="mt-2"
                value={config.sheetName}
                onChange={(event) => setConfig({ ...config, sheetName: event.target.value })}
                placeholder="Página1"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            As configurações são salvas neste navegador. A autenticação usa sua sessão de administrador.
          </p>
          <Button onClick={handleSave} className="gap-2">
            {saved ? <Check className="size-4 text-emerald-300" /> : <Check className="size-4" />}
            {saved ? 'Salvo!' : 'Salvar configurações'}
          </Button>
        </div>
      </AdminCard>

      <AdminCard className="max-w-2xl bg-malva-50/50">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-malva-800">
          <Sheet className="size-4 text-emerald-600" />
          Google Sheets privado
        </h4>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          O painel lê os leads pelo n8n usando sua sessão de administrador. A planilha pode permanecer restrita à conta Google conectada ao n8n. O token Apify cadastrado acima é enviado somente ao iniciar o scraping.
        </p>
      </AdminCard>
    </div>
  )
}
