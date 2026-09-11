import type { ComponentProps } from 'react'
import { Drawer as Vaul } from 'vaul'
import { cn } from '@/lib/utils'

export const Drawer = Vaul.Root
export const DrawerTrigger = Vaul.Trigger
export const DrawerClose = Vaul.Close
export const DrawerTitle = Vaul.Title
export const DrawerDescription = Vaul.Description

interface DrawerContentProps extends ComponentProps<typeof Vaul.Content> {
  side?: 'bottom' | 'left'
}

export function DrawerContent({ className, children, side = 'bottom', ...props }: DrawerContentProps) {
  return (
    <Vaul.Portal>
      <Vaul.Overlay className="fixed inset-0 z-50 bg-tinta/45" />
      <Vaul.Content
        className={cn(
          'fixed z-50 flex flex-col bg-background outline-none',
          side === 'bottom'
            ? 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl'
            : 'inset-y-0 left-0 h-dvh w-[86vw] max-w-sm overflow-hidden rounded-r-3xl',
          className,
        )}
        {...props}
      >
        {side === 'bottom' && <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-malva-200" />}
        {children}
      </Vaul.Content>
    </Vaul.Portal>
  )
}
