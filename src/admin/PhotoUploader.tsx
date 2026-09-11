import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, GripVertical, Loader2, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import {
  deleteProductImage,
  fetchProductImages,
  reorderProductImages,
  uploadProductImage,
  type StoredImage,
} from './api'

/** Fotos do produto: câmera/galeria, 1ª é a capa, arrastar para reordenar, comprime em WebP no aparelho. */
export function PhotoUploader({ productId, slug }: { productId: string; slug?: string }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragId = useRef<string | null>(null)
  const key = ['product-images', productId]
  const { data: images = [], isPending } = useQuery({ queryKey: key, queryFn: () => fetchProductImages(productId) })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      let order = images.length
      for (const file of files) {
        await uploadProductImage(productId, file, order++, slug)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast.error('Não foi possível enviar a foto'),
  })

  const remove = useMutation({
    mutationFn: (image: StoredImage) => deleteProductImage(image),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast.error('Não foi possível remover'),
  })

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderProductImages(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const move = (targetId: string) => {
    const from = images.findIndex((i) => i.id === dragId.current)
    const to = images.findIndex((i) => i.id === targetId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...images]
    next.splice(to, 0, next.splice(from, 1)[0])
    reorder.mutate(next.map((i) => i.id))
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-malva-800">Fotos</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) upload.mutate(files)
          e.target.value = ''
        }}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={() => (dragId.current = image.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => move(image.id)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-malva-100"
          >
            <img src={image.sm} alt="" className="size-full object-cover" />
            {index === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-malva-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Capa
              </span>
            )}
            <GripVertical className="absolute bottom-1 left-1 size-4 text-white/80 drop-shadow" />
            <button
              type="button"
              aria-label="Remover foto"
              onClick={() => remove.mutate(image)}
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-malva-300 hover:text-malva-600"
        >
          {upload.isPending || isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Fundo claro, luz natural e a peça centralizada. Arraste para escolher a capa.
      </p>
    </div>
  )
}
