import { createId } from '../../lib/create-id'
import { imageAssetSchema } from '../../db/models'
import type { ImageAsset } from '../../db/models'

export async function compressImage(
  file: File,
  avatar = false,
): Promise<ImageAsset> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error('Choose JPEG, PNG or WebP up to 15 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40_000_000
    )
      throw new Error('Image dimensions are too large.')
    const maxDimension = avatar ? 256 : 1280
    const maxBytes = (avatar ? 128 : 512) * 1024
    let scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    )
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (context === null) throw new Error('Image processing unavailable.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      let blob = await canvasBlob(canvas, 'image/webp')
      if (blob.type !== 'image/webp')
        blob = await canvasBlob(canvas, 'image/jpeg')
      if (blob.size <= maxBytes)
        return imageAssetSchema.parse({
          id: createId(),
          blob,
          mime: blob.type,
          width: canvas.width,
          height: canvas.height,
          byteLength: blob.size,
          createdAt: Date.now(),
        })
      scale *= 0.75
    }
    throw new Error('Image could not fit the storage limit.')
  } finally {
    bitmap.close()
  }
}
function canvasBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) reject(new Error('Image compression failed.'))
        else resolve(blob)
      },
      mime,
      0.8,
    )
  })
}
