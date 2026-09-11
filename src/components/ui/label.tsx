import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-semibold text-malva-800', className)} {...props} />
}
