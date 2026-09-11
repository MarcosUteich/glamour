// Comprime a foto no próprio celular antes de enviar: uma versão grande (lado maior 1600)
// e uma quadrada de 480 (usada na grade). Sempre em WebP.

export interface ProcessedImage {
  lg: Blob
  sm: Blob
  width: number
  height: number
}

const LG_MAX = 1600
const SM_SIZE = 480
const LG_QUALITY = 0.82
const SM_QUALITY = 0.8

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir a imagem'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))),
      'image/webp',
      quality,
    )
  })
}

function draw(img: HTMLImageElement, sw: number, sh: number, sx: number, sy: number, dw: number, dh: number) {
  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
  return canvas
}

export async function processProductImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file)
  const { naturalWidth: w, naturalHeight: h } = img

  const scale = Math.min(1, LG_MAX / Math.max(w, h))
  const lgW = Math.round(w * scale)
  const lgH = Math.round(h * scale)
  const lg = await toBlob(draw(img, w, h, 0, 0, lgW, lgH), LG_QUALITY)

  const side = Math.min(w, h)
  const sx = Math.round((w - side) / 2)
  const sy = Math.round((h - side) / 2)
  const sm = await toBlob(draw(img, side, side, sx, sy, SM_SIZE, SM_SIZE), SM_QUALITY)

  return { lg, sm, width: lgW, height: lgH }
}
