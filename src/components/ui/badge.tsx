import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', {
  variants: {
    variant: {
      default: 'bg-malva-100 text-malva-800',
      gold: 'bg-[#F4EBD8] text-[#6E5321]',
      ok: 'bg-ok-fundo text-ok',
      dark: 'bg-tinta/80 text-white',
      danger: 'bg-red-50 text-red-700',
      outline: 'border border-border text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
