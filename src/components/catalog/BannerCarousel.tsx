import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Banner } from '@/lib/types'

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const banner = banners[index]
  useEffect(() => {
    if (paused || banners.length < 2) return
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % banners.length), banner.duration_seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [banner.duration_seconds, banners.length, index, paused])
  const picture = <picture>
    {banner.mobile_image_url && <source media="(max-width: 1023px)" srcSet={banner.mobile_image_url} width={1000} height={639} />}
    <img src={banner.image_url} alt={banner.title} title={banner.title} width={2000} height={666}
      className="mx-auto block aspect-[1000/639] w-full max-w-160 object-contain lg:aspect-[2000/666] lg:max-w-none" loading="eager" fetchPriority="high" />
  </picture>
  return <section aria-label="Campanhas da loja" aria-roledescription="carrossel" className="relative overflow-hidden bg-malva-50" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    {banner.link ? (banner.link.startsWith('/') && !banner.link.startsWith('//') ? <Link to={banner.link}>{picture}</Link> : <a href={banner.link}>{picture}</a>) : picture}
  </section>
}
