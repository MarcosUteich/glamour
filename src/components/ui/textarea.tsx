import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-xl border border-input bg-white px-4 py-3 text-base text-tinta transition-colors placeholder:text-muted-foreground/70 focus-visible:border-malva-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-malva-200 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
