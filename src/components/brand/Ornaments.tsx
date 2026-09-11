import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Os dois pontinhos do letreiro */
export function Dots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex items-center gap-[3px]', className)}>
      <span className="size-[5px] rounded-full bg-current" />
      <span className="size-[5px] rounded-full bg-current" />
    </span>
  )
}

/** Título de seção no estilo do letreiro: •• BRINCOS •• */
export function SectionTitle({ children, className, as: Tag = 'h2' }: { children: ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3' }) {
  return (
    <Tag
      className={cn(
        'flex items-center justify-center gap-3 text-[13px] font-semibold uppercase tracking-[0.28em] text-malva-800',
        className,
      )}
    >
      <Dots className="text-dourado" />
      {children}
      <Dots className="text-dourado" />
    </Tag>
  )
}

/** Filete dourado com losango no meio */
export function GoldDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex items-center justify-center gap-3', className)}>
      <span className="h-px w-14 bg-dourado/60" />
      <span className="size-2 rotate-45 bg-dourado" />
      <span className="h-px w-14 bg-dourado/60" />
    </div>
  )
}

const BEADS: Array<[number, number]> = [
  [76, 67.6],
  [109.6, 88.3],
  [210.4, 88.3],
  [244, 67.6],
]
const SPARKLE = 'M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z'
const SPARKLES: Array<[number, number, number]> = [
  [192, 122, 1],
  [134, 150, 0.7],
  [182, 156, 0.55],
]

/** Colar dourado em traço, como no tapume */
export function NecklaceArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 170" aria-hidden className={className}>
      <path d="M20 10 Q160 190 300 10" fill="none" className="stroke-dourado" strokeWidth="2.5" strokeLinecap="round" />
      {BEADS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="3.6" className="fill-dourado" />
      ))}
      <path d="M160 100 v11" className="stroke-dourado" strokeWidth="2" />
      <path d="M160 111 L171 126 L160 141 L149 126 Z" className="fill-dourado" />
      <path d="M160 116 L166 126 L160 136 L154 126 Z" className="fill-dourado-claro" />
      {SPARKLES.map(([x, y, s]) => (
        <path key={x} d={SPARKLE} transform={`translate(${x} ${y}) scale(${s})`} className="fill-dourado" />
      ))}
    </svg>
  )
}
