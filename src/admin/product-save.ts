import { fetchProductImages, saveProduct, uploadProductImage, type ProductInput } from './api'

export interface PendingPhoto {
  id: string
  file: File
}

export class PhotoUploadError extends Error {
  constructor(readonly productId: string, readonly remaining: number) {
    super('Produto salvo, mas há fotos pendentes')
  }
}

export async function saveProductWithPhotos(
  input: ProductInput,
  productId: string | undefined,
  photos: PendingPhoto[],
  onProductSaved: (id: string) => void,
  onPhotoSaved: (id: string) => void,
): Promise<string> {
  const savedId = await saveProduct(input, productId)
  // Keep the ID immediately: a failed upload must never cause a second product insert.
  onProductSaved(savedId)
  if (!photos.length) return savedId

  let completed = 0
  try {
    const stored = await fetchProductImages(savedId)
    const storedIds = new Set(stored.map((image) => image.id))
    let order = stored.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1
    for (const photo of photos) {
      if (!storedIds.has(photo.id)) {
        await uploadProductImage(savedId, photo.file, order++, input.slug, photo.id)
      }
      completed++
      onPhotoSaved(photo.id)
    }
  } catch {
    throw new PhotoUploadError(savedId, photos.length - completed)
  }
  return savedId
}
