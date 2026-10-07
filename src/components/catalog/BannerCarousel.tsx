import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from '@/components/ui/carousel'
import type { Banner } from '@/lib/types'

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const banner = banners[index]

  useEffect(() => {
    if (!api) return
    const select = () => setIndex(api.selectedScrollSnap())
    const down = () => setDragging(true)
    const up = () => setDragging(false)
    api.on('select', select).on('reInit', select).on('pointerDown', down).on('pointerUp', up)
    return () => { api.off('select', select).off('reInit', select).off('pointerDown', down).off('pointerUp', up) }
  }, [api])

  useEffect(() => {
    if (!api || paused || dragging || banners.length < 2) return
    const timer = window.setTimeout(() => api.scrollNext(), banner.duration_seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [api, banner.duration_seconds, banners.length, index, paused, dragging])

  return <Carousel setApi={setApi} opts={{ loop: true, align: 'start' }}
    aria-label="Campanhas da loja" className="overflow-hidden bg-malva-50"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    <div className="relative">
      <CarouselContent className="ml-0 touch-pan-y">
        {banners.map((item, position) => {
          const picture = <picture>
            {item.mobile_image_url && <source media="(max-width: 639px)" srcSet={item.mobile_image_url} width={3840} height={840} />}
            <img src={item.image_url} alt={item.title} title={item.title} width={3840} height={840}
              className="block aspect-[1050/653] w-full object-cover object-center sm:aspect-[3840/840]"
              loading="eager" fetchPriority={position === 0 ? 'high' : 'auto'} draggable={false} />
          </picture>
          return <CarouselItem key={item.id} className="pl-0" aria-label={`${position + 1} de ${banners.length}`}
            inert={position !== index}>
            {item.link ? (item.link.startsWith('/') && !item.link.startsWith('//')
              ? <Link to={item.link} draggable={false}>{picture}</Link>
              : <a href={item.link} draggable={false}>{picture}</a>) : picture}
          </CarouselItem>
        })}
      </CarouselContent>
      {banners.length > 1 && <>
        <CarouselPrevious aria-label="Banner anterior" className="left-3 hidden size-10 cursor-pointer border-0 bg-white/95 shadow-md lg:flex" />
        <CarouselNext aria-label="Próximo banner" className="right-3 hidden size-10 cursor-pointer border-0 bg-white/95 shadow-md lg:flex" />
      </>}
    </div>
    {banners.length > 1 && <div className="flex flex-wrap items-center justify-center gap-1 bg-white py-2" role="group" aria-label="Selecionar banner">
      {banners.map((item, position) => <button key={item.id} type="button"
        aria-label={`Ver banner ${position + 1} de ${banners.length}: ${item.title}`}
        aria-current={position === index ? 'true' : undefined} onClick={() => api?.scrollTo(position)}
        className="grid size-8 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-malva-500">
        <span className={`size-2 rounded-full transition-colors ${position === index ? 'bg-malva-600' : 'bg-malva-200'}`} />
      </button>)}
    </div>}
  </Carousel>
}
