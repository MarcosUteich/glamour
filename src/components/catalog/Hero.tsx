export function Hero({
  minOrderCents,
  onShop,
}: {
  minOrderCents: number
  onShop: () => void
}) {
  const minOrder = (minOrderCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <section className="w-full overflow-hidden bg-[#f8e5e2]">
      {/* ───────── DESKTOP (≥1024px): banner completo ───────── */}
      <img
        src="/hero-desktop.jpg"
        alt={`Semijoias para revender no atacado. Pedido mínimo de ${minOrder} e retirada na loja no Lindóia Shopping.`}
        className="hidden h-auto w-full lg:block"
        width={2000}
        height={666}
        loading="lazy"
        decoding="async"
      />

      {/* ───────── MOBILE / TABLET (<1024px): foto + texto em HTML ───────── */}
      <div className="lg:hidden">
        <div className="relative mx-auto w-full max-w-[640px]">
          <img
            src="/hero-mobile.jpg"
            alt=""
            className="block h-auto w-full"
            width={1000}
            height={639}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          {/* degradê que dissolve a foto no fundo rosado */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f8e5e2] via-[#f8e5e2]/70 to-transparent" />
        </div>

        <div className="relative mx-auto -mt-6 max-w-[640px] px-6 pb-9 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium tracking-[0.35em] text-[#8c4a63]">
              ATACADO
            </span>
            <span className="h-px flex-1 bg-[#c9a76a]/70" />
          </div>

          <h1 className="mt-3 font-['Playfair_Display','Bodoni_Moda',Georgia,serif] leading-[0.95] tracking-tight">
            <span className="flex items-start gap-2 text-[clamp(2.6rem,13vw,4rem)] font-medium text-[#6b2d4a]">
              Semijoias
              <Sparkles />
            </span>
            <span className="block text-[clamp(2.3rem,11.5vw,3.5rem)] font-normal italic text-[#b05a76]">
              para revender
            </span>
          </h1>

          <p className="mt-4 max-w-[30ch] text-[15px] leading-snug text-[#7a5565]">
            Qualidade, variedade e peças selecionadas para valorizar o seu negócio.
          </p>

          <div className="mt-6 flex items-stretch gap-5">
            <div>
              <p className="text-[10px] font-medium tracking-[0.25em] text-[#8c4a63]">
                PEDIDO MÍNIMO
              </p>
              <p className="mt-1 text-lg font-semibold text-[#6b2d4a]">{minOrder}</p>
            </div>
            <span className="w-px bg-[#c9a76a]" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.25em] text-[#8c4a63]">
                RETIRADA NA LOJA
              </p>
              <p className="mt-1 text-lg font-semibold text-[#6b2d4a]">Lindóia Shopping</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onShop}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#8c4a63] px-8 text-sm font-semibold tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(140,74,99,0.7)] transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c4a63] sm:w-auto"
          >
            Ver as peças
          </button>
        </div>
      </div>
    </section>
  )
}

function Sparkles() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 48"
      className="mt-1 h-[0.55em] w-auto shrink-0 text-[#c9a76a]"
      fill="currentColor"
    >
      <path d="M24 0c1.2 9 4.8 12.6 14 14-9.2 1.4-12.8 5-14 14-1.2-9-4.8-12.6-14-14C19.200 12.600 22.800 9 24 0Z" />
      <path d="M9 30c.7 5 2.600 7 7.500 7.700C11.600 38.400 9.700 40.400 9 45.500 8.300 40.400 6.400 38.400 1.500 37.700 6.400 37 8.300 35 9 30Z" />
    </svg>
  )
}