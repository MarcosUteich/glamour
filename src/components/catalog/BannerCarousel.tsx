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
    {banner.mobile_image_url && <source media="(max-width: 1023px)" srcSet={banner.mobile_image_url} />}
    <img src={banner.image_url} alt={banner.title} className="block w-full h-auto" fetchPriority="high" />
  </picture>
  return <section aria-label="Campanhas da loja" aria-roledescription="carrossel" className="relative overflow-hidden bg-malva-50" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    {banner.link ? (banner.link.startsWith('/') && !banner.link.startsWith('//') ? <Link to={banner.link}>{picture}</Link> : <a href={banner.link}>{picture}</a>) : picture}
    {banners.length > 1 && <div className="flex items-center justify-center gap-2 bg-white/90 py-2">
      {banners.map((item, i) => <button key={item.id} type="button" aria-label={`Mostrar ${item.title}`} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)} className="grid size-8 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring"><span className={`size-2.5 rounded-full ${i === index ? 'bg-malva-700' : 'bg-malva-200'}`} /></button>)}
      <button type="button" className="px-3 text-xs font-medium text-malva-700" onClick={() => setPaused(!paused)}>{paused ? 'Reproduzir' : 'Pausar'}</button>
    </div>}
  </section>
}
