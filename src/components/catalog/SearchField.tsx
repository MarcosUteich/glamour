import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nome ou código"
        aria-label="Buscar peças"
        className="rounded-full pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-malva-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
