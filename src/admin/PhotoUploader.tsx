import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, GripVertical, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { deleteProductImage, fetchProductImages, reorderProductImages, type StoredImage } from './api'
import type { PendingPhoto } from './product-save'

/** New photos stay in memory until the product form is saved. */
export function PhotoUploader({ productId, photos, onChange, disabled = false }: {
  productId?: string
  photos: PendingPhoto[]
  onChange: (photos: PendingPhoto[]) => void
  disabled?: boolean
}) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragId = useRef<string | null>(null)
  const key = ['product-images', productId]
  const { data: images = [], isPending } = useQuery({
    queryKey: key, queryFn: () => fetchProductImages(productId!), enabled: !!productId,
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['admin-products'] })
    qc.invalidateQueries({ queryKey: ['admin-product', productId] })
    qc.invalidateQueries({ queryKey: ['catalog'] })
  }
  const remove = useMutation({
    mutationFn: (image: StoredImage) => deleteProductImage(image),
    onSuccess: refresh,
    onError: () => toast.error('Não foi possível remover'),
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderProductImages(ids),
    onSuccess: refresh,
    onError: () => toast.error('Não foi possível reordenar as fotos'),
  })
  const busy = disabled || remove.isPending || reorder.isPending || (!!productId && isPending)
  const move = (targetId: string) => {
    if (busy) return
    const sourceId = dragId.current
    dragId.current = null
    const pendingFrom = photos.findIndex((photo) => photo.id === sourceId)
    const pendingTo = photos.findIndex((photo) => photo.id === targetId)
    if (pendingFrom >= 0 && pendingTo >= 0 && pendingFrom !== pendingTo) {
      const next = [...photos]
      next.splice(pendingTo, 0, next.splice(pendingFrom, 1)[0])
      onChange(next)
      return
    }
    const from = images.findIndex((image) => image.id === sourceId)
    const to = images.findIndex((image) => image.id === targetId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...images]
    next.splice(to, 0, next.splice(from, 1)[0])
    reorder.mutate(next.map((image) => image.id))
  }
  const tileClass = 'group relative aspect-square overflow-hidden rounded-xl border border-border bg-malva-100'
  const removeClass = 'absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/90 text-destructive transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-malva-800">Fotos</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length) onChange([...photos, ...files.map((file) => ({ id: crypto.randomUUID(), file }))])
          event.target.value = ''
        }}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image, index) => (
          <div key={image.id} draggable={!busy} onDragStart={() => (dragId.current = image.id)}
            onDragOver={(event) => event.preventDefault()} onDrop={() => move(image.id)} className={tileClass}>
            <img src={image.sm} alt={`Foto ${index + 1} do produto`} className="size-full object-cover" />
            {index === 0 && <CoverBadge />}
            <GripVertical className="absolute bottom-1 left-1 size-4 text-white/80 drop-shadow" />
            <button type="button" aria-label={`Remover foto ${index + 1}`} disabled={busy}
              onClick={() => remove.mutate(image)} className={removeClass}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {photos.map((photo, index) => (
          <div key={photo.id} draggable={!busy} onDragStart={() => (dragId.current = photo.id)}
            onDragOver={(event) => event.preventDefault()} onDrop={() => move(photo.id)} className={tileClass}>
            <PhotoPreview file={photo.file} />
            {!images.length && index === 0 && <CoverBadge />}
            <span className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] text-malva-800">Pendente</span>
            <button type="button" aria-label={`Remover foto selecionada ${index + 1}`} disabled={busy}
              onClick={() => onChange(photos.filter((item) => item.id !== photo.id))} className={removeClass}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button type="button" aria-label="Adicionar fotos" onClick={() => inputRef.current?.click()} disabled={busy}
          className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-malva-300 hover:text-malva-600 disabled:opacity-50">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        As novas fotos serão enviadas ao salvar o produto. A primeira é a capa; arraste para reordenar.
      </p>
    </div>
  )
}

function CoverBadge() {
  return <span className="absolute left-1 top-1 rounded-full bg-malva-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Capa</span>
}

function PhotoPreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const preview = URL.createObjectURL(file)
    if (imageRef.current) imageRef.current.src = preview
    return () => URL.revokeObjectURL(preview)
  }, [file])
  return <img ref={imageRef} alt={file.name} className="size-full object-cover" />
}
