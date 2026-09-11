import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// text-base (16px) evita o zoom automático do iPhone ao tocar no campo
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-xl border border-input bg-white px-4 text-base text-tinta transition-colors placeholder:text-muted-foreground/70 focus-visible:border-malva-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-malva-200 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15',
        className,
      )}
      {...props}
    />
  )
}
