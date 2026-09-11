import { cn } from '@/lib/utils'
import { DOT_PATHS, LETTER_PATHS, LETTERS_VIEWBOX, WORDMARK_VIEWBOX } from './logo-paths'

interface WordmarkProps {
  /** Os "••" antes e depois do nome, como no letreiro */
  dots?: boolean
  className?: string
  /** Classe para colorir só os pontos (ex.: fill-dourado) */
  dotsClassName?: string
  label?: string
}

/** Letreiro "Glamour" vetorizado da fachada. A cor vem de currentColor (classes text-*). */
export function Wordmark({ dots = true, className, dotsClassName, label = 'Glamour' }: WordmarkProps) {
  return (
    <svg
      viewBox={dots ? WORDMARK_VIEWBOX : LETTERS_VIEWBOX}
      role="img"
      aria-label={label}
      className={cn('block h-auto fill-current', className)}
    >
      {LETTER_PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
      {dots && (
        <g className={dotsClassName}>
          {DOT_PATHS.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
        </g>
      )}
    </svg>
  )
}
