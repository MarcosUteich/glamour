import { MapPin, ShoppingBag } from 'lucide-react'
import { NecklaceArt } from '@/components/brand/Ornaments'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/money'

export function Hero({ minOrderCents, onShop }: { minOrderCents: number; onShop: () => void }) {
  return (
    <section className="relative overflow-hidden bg-malva-100">
      <NecklaceArt className="pointer-events-none absolute left-1/2 top-0 w-[320px] max-w-none -translate-x-1/2 sm:w-[420px]" />
      <div className="relative mx-auto max-w-2xl px-6 pb-12 pt-[178px] text-center sm:pt-[222px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-malva-600">
          Atacado para lojistas e revendedoras
        </p>
        <h1 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-malva-800 sm:text-5xl">
          Revenda Glamour
          <span className="mt-2 block text-base font-medium tracking-normal text-malva-600 sm:text-lg">
            Semijoias no atacado em Porto Alegre
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-malva-800/85 sm:text-lg">
          Semijoias, acessórios e maquiagem selecionados para o seu negócio.
        </p>
        <p className="mt-1 font-script text-[26px] text-malva-500">peças para você brilhar</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-[13px] font-medium text-malva-800">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3.5 py-2">
            <ShoppingBag className="size-4 text-dourado" /> Pedido mínimo {formatBRL(minOrderCents)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3.5 py-2">
            <MapPin className="size-4 text-dourado" /> Retirada no Lindóia Shopping
          </span>
        </div>
        <Button size="lg" className="mt-7 w-full max-w-xs" onClick={onShop}>
          Comprar no atacado
        </Button>
      </div>
    </section>
  )
}
