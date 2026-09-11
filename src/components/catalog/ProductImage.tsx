import { useState } from 'react'

interface ProductImageProps {
  src?: string | null
  /** Ilustração da categoria, usada sem foto ou se a foto falhar */
  fallback: string
  alt: string
  className?: string
  eager?: boolean
}

export function ProductImage({ src, fallback, alt, className, eager = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={!src || failed ? fallback : src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
