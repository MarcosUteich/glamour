import { Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { QtyStepper } from '@/components/catalog/QtyStepper'
import { productSubtitle } from '@/lib/catalog'
import { formatBRL } from '@/lib/money'
import { categoryArt } from '@/lib/placeholders'
import { maxQuantityFor, type CartLine } from '@/store/cart-logic'

export function CartLineRow({ line, onQuantity }: { line: CartLine; onQuantity: (quantity: number) => void }) {
  const href = `/produto/${line.slug}`

  return (
    <li className="flex gap-3 py-4">
      <Link to={href} className="shrink-0">
        <img src={line.photo ?? categoryArt(null)} alt="" className="size-20 rounded-xl bg-malva-100 object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={href} className="line-clamp-2 text-[14px] font-medium leading-snug text-tinta">
              {line.name}
            </Link>
            <p className="text-xs text-muted-foreground">{productSubtitle(line)}</p>
          </div>
          <button
            type="button"
            aria-label={`Remover ${line.name}`}
            onClick={() => onQuantity(0)}
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-malva-100 hover:text-malva-800"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="w-[120px]">
            <QtyStepper
              size="sm"
              value={line.quantity}
              min={1}
              max={maxQuantityFor(line.stock)}
              onChange={onQuantity}
              label={`Quantidade de ${line.name}`}
            />
          </div>
          <div className="text-right">
            <p className="text-[11.5px] tabular-nums text-muted-foreground">{formatBRL(line.priceCents)} cada</p>
            <p className="text-[15px] font-bold tabular-nums text-malva-800">{formatBRL(line.priceCents * line.quantity)}</p>
          </div>
        </div>
      </div>
    </li>
  )
}
