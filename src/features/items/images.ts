import { createId } from '../../lib/create-id'
import { InputError } from '../../lib/input-error'
import { imageAssetSchema } from '../../db/models'
import type { ImageAsset } from '../../db/models'
import { beginOperation } from '../../pwa/operations'
import { readImageHeader } from './image-header'

const maxFileBytes = 15 * 1024 * 1024
const maxPixels = 40_000_000
// Metadata before the JPEG frame header is usually small; the rest is read only if needed.
const headerBytes = 256 * 1024
async function inspect(file: File) {
  const start = new Uint8Array(await file.slice(0, headerBytes).arrayBuffer())
  return (
    readImageHeader(start) ??
    (file.size > headerBytes
      ? readImageHeader(new Uint8Array(await file.arrayBuffer()))
      : null)
  )
}
export async function compressImage(
  file: File,
  avatar = false,
): Promise<ImageAsset> {
  if (file.size > maxFileBytes) throw new InputError('image-size')
  const finish = beginOperation()
  let bitmap: ImageBitmap | undefined
  try {
    // The type and size come from the file itself before any decoding: the
    // declared type can be missing or wrong, and decoding a huge image can
    // exhaust the memory of a phone.
    const header = await inspect(file)
    if (header === null) throw new InputError('image-format')
    if (header.width * header.height > maxPixels)
      throw new InputError('image-pixels')
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      throw new InputError('image-decode')
    }
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > maxPixels
    )
      throw new InputError('image-pixels')
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
    throw new InputError('image-fit')
  } finally {
    bitmap?.close()
    finish()
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
