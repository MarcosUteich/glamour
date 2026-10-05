import { Loader2, Play, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  triggerN8nScraping,
  type ScrapingPayload,
} from '../leads-config'

interface ScrapingModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function ScrapingModal({ onClose, onSuccess }: ScrapingModalProps) {
  const [nicho, setNicho] = useState('joalheria')
  const [tipoLocalizacao, setTipoLocalizacao] = useState<'CIDADE' | 'BAIRRO' | 'CEP'>('CIDADE')
  const [cidade, setCidade] = useState('Porto Alegre')
  const [estado, setEstado] = useState('RS')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [limiteBusca, setLimiteBusca] = useState(80)
  const [limiteSalvar, setLimiteSalvar] = useState(80)
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
                className={`cursor-pointer rounded-xl border py-2 text-xs font-semibold transition-colors ${
                  tipoLocalizacao === tipo
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
