import { Check, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminCard } from './ui'

export function LeadScrapingSettings() {
  const [token, setToken] = useState('')

  return (
    <AdminCard className="max-w-xl">
      <h3 className="flex items-center gap-2 font-semibold text-malva-800"><KeyRound className="size-4" />Token de acesso</h3>
      <p className="mt-2 text-sm text-muted-foreground">Um único token da Apify para a busca no Google Maps. Quando precisar trocar, basta substituir o valor aqui.</p>
      <label className="mt-5 block text-sm font-medium text-malva-800">
        Token da Apify
        <Input className="mt-2" type="password" autoComplete="off" spellCheck={false} value={token}
          onChange={(event) => setToken(event.target.value)} placeholder="Digite o token" />
      </label>
      <p className="mt-3 text-xs text-muted-foreground">Salvamento indisponível até conectar o n8n.</p>
      <Button className="mt-5" disabled><Check className="size-4" />Salvar token</Button>
    </AdminCard>
  )
}
