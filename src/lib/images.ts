// Comprime a foto no próprio celular antes de enviar:
// - grande (lado maior 1600) e quadrada de 480 (usada na grade), em WebP;
// - quadrada de até 1080 em JPEG, para a prévia de link no WhatsApp/Facebook e o catálogo da Meta,
//   que nem sempre mostram WebP.

export interface ProcessedImage {
  lg: Blob
  sm: Blob
  share: Blob
  width: number
  height: number
}

const LG_MAX = 1600
const SM_SIZE = 480
const SHARE_MAX = 1080
const LG_QUALITY = 0.82
const SM_QUALITY = 0.8
const SHARE_QUALITY = 0.85

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

function toBlob(canvas: HTMLCanvasElement, type: 'image/webp' | 'image/jpeg', quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), type, quality)
  })
}

function draw(
  img: HTMLImageElement,
  sw: number,
  sh: number,
  sx: number,
  sy: number,
  dw: number,
  dh: number,
  /** Fundo para formatos sem transparência (JPEG) */
  background?: string,
) {
  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, dw, dh)
  }
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
  const lg = await toBlob(draw(img, w, h, 0, 0, lgW, lgH), 'image/webp', LG_QUALITY)

  // Mesmo recorte quadrado central da grade do catálogo
  const side = Math.min(w, h)
  const sx = Math.round((w - side) / 2)
  const sy = Math.round((h - side) / 2)
  const sm = await toBlob(draw(img, side, side, sx, sy, SM_SIZE, SM_SIZE), 'image/webp', SM_QUALITY)

  const shareSide = Math.min(side, SHARE_MAX)
  const share = await toBlob(draw(img, side, side, sx, sy, shareSide, shareSide, '#ffffff'), 'image/jpeg', SHARE_QUALITY)

  return { lg, sm, share, width: lgW, height: lgH }
}
