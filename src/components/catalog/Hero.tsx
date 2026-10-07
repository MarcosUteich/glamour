import { useSettings } from '@/hooks/useCatalog'
import { BannerCarousel } from './BannerCarousel'

export function Hero() {
  const banners = useSettings().banners?.filter((banner) => banner.active) ?? []
  return banners.length ? <BannerCarousel key={JSON.stringify(banners)} banners={banners} /> : null
}
