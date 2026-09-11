import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface QtyStepperProps {
  value: number
  onChange: (value: number) => void
  max: number
  /** 0 permite tirar a peça do pedido pelo "−" */
  min?: number
  size?: 'sm' | 'md'
  label?: string
}

/** [−] 12 [+] com o número editável (atacado costuma pedir em quantidade). */
export function QtyStepper({ value, onChange, max, min = 0, size = 'md', label = 'Quantidade' }: QtyStepperProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const n = Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isFinite(n)) onChange(Math.min(Math.max(n, min), max))
  }

  const button =
    'grid h-full aspect-square place-items-center rounded-full text-malva-700 transition-colors hover:bg-malva-100 disabled:opacity-35 disabled:hover:bg-transparent'

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between rounded-full border border-malva-300 bg-white p-0.5',
        size === 'sm' ? 'h-9' : 'h-12',
      )}
    >
      <button
        type="button"
        className={button}
        aria-label="Diminuir quantidade"
        onClick={() => onChange(Math.max(value - 1, min))}
        disabled={value <= min}
      >
        <Minus className="size-4" />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-10 min-w-0 flex-1 bg-transparent text-center text-base font-semibold tabular-nums text-tinta outline-none"
        value={draft ?? String(value)}
        onFocus={(e) => {
          setDraft(String(value))
          e.currentTarget.select()
        }}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <button
        type="button"
        className={button}
        aria-label="Aumentar quantidade"
        onClick={() => onChange(Math.min(value + 1, max))}
        disabled={value >= max}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
