import { z } from 'zod'
import { Zip, ZipPassThrough, strToU8 } from 'fflate'
import {
  historySchema,
  imageAssetSchema,
  itemSchema,
  listSchema,
  profileSchema,
} from '../../db/models'
import type { ImageAsset } from '../../db/models'

const assetSchema = z.strictObject({
  id: imageAssetSchema.shape.id,
  mime: imageAssetSchema.shape.mime,
  width: imageAssetSchema.shape.width,
  height: imageAssetSchema.shape.height,
  byteLength: imageAssetSchema.shape.byteLength,
  createdAt: imageAssetSchema.shape.createdAt,
})
export const backupSchema = z.strictObject({
  format: z.literal('cartoon-check'),
  formatVersion: z.literal(1),
  databaseVersion: z.literal(1),
  exportedAt: z.number().int().nonnegative().max(8_640_000_000_000_000),
  profile: profileSchema.nullable(),
  lists: z.array(listSchema),
  items: z.array(itemSchema),
  history: z.array(historySchema),
  assets: z.array(assetSchema),
})
export type BackupMetadata = z.infer<typeof backupSchema>
export interface BackupData {
  metadata: BackupMetadata
  assets: ImageAsset[]
}
export function assetPath(asset: Pick<ImageAsset, 'id' | 'mime'>) {
  return `assets/${asset.id}.${asset.mime === 'image/webp' ? 'webp' : 'jpg'}`
}

export async function packBackup(data: BackupData): Promise<Blob> {
  const metadata = backupSchema.parse(data.metadata)
  const json = strToU8(JSON.stringify(metadata))
  const total =
    json.byteLength +
    data.assets.reduce((sum, asset) => sum + asset.byteLength + 256, 0) +
    256
  if (total > 0xffffffff || data.assets.length + 1 >= 0xffff)
    throw new Error('The backup exceeds the ZIP format limit.')
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let finish: (() => void) | undefined
  let fail: ((error: Error) => void) | undefined
  const completed = new Promise<void>((resolve, reject) => {
    finish = resolve
    fail = reject
  })
  const zip = new Zip((error, chunk, final) => {
    if (error) fail?.(error)
    else {
      chunks.push(new Uint8Array(chunk))
      if (final) finish?.()
    }
  })
  const add = (name: string, bytes: Uint8Array) => {
    const entry = new ZipPassThrough(name)
    zip.add(entry)
    entry.push(bytes, true)
  }
  try {
    add('backup.json', json)
    for (const asset of data.assets)
      add(assetPath(asset), new Uint8Array(await asset.blob.arrayBuffer()))
    zip.end()
    await completed
    return new Blob(chunks, { type: 'application/zip' })
  } catch (error) {
    zip.terminate()
    throw error
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes)
    crc = (crcTable[(crc ^ byte) & 255] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
export function readStoredZip(
  buffer: ArrayBuffer,
): Map<string, Uint8Array<ArrayBuffer>> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const invalid = () => new Error('Invalid or unsupported backup archive.')
  const check = (offset: number, length: number) => {
    if (offset < 0 || length < 0 || offset + length > bytes.length)
      throw invalid()
  }
  const u16 = (offset: number) => {
    check(offset, 2)
    return view.getUint16(offset, true)
  }
  const u32 = (offset: number) => {
    check(offset, 4)
    return view.getUint32(offset, true)
  }
  const end = bytes.length - 22
  if (
    end < 0 ||
    u32(end) !== 0x06054b50 ||
    u16(end + 4) !== 0 ||
    u16(end + 6) !== 0 ||
    u16(end + 20) !== 0
  )
    throw invalid()
  const count = u16(end + 10)
  if (count === 0 || count === 0xffff || u16(end + 8) !== count) throw invalid()
  const centralSize = u32(end + 12)
  const centralOffset = u32(end + 16)
  if (centralOffset + centralSize !== end) throw invalid()
  const decode = new TextDecoder('utf-8', { fatal: true })
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  const ranges: { start: number; end: number }[] = []
  let cursor = centralOffset
  for (let index = 0; index < count; index++) {
    check(cursor, 46)
    if (u32(cursor) !== 0x02014b50) throw invalid()
    const flags = u16(cursor + 8),
      method = u16(cursor + 10),
      crc = u32(cursor + 16),
      size = u32(cursor + 24),
      offset = u32(cursor + 42)
    const nameLength = u16(cursor + 28),
      extraLength = u16(cursor + 30),
      commentLength = u16(cursor + 32)
    if (
      flags & ~0x808 ||
      method !== 0 ||
      u32(cursor + 20) !== size ||
      extraLength ||
      commentLength ||
      u16(cursor + 34)
    )
      throw invalid()
    check(cursor + 46, nameLength)
    const name = decode.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    )
    if (
      name !== 'backup.json' &&
      !/^assets\/[0-9a-f-]{36}\.(?:webp|jpg)$/.test(name)
    )
      throw invalid()
    if (files.has(name) || offset >= centralOffset) throw invalid()
    check(offset, 30)
    if (
      u32(offset) !== 0x04034b50 ||
      u16(offset + 6) !== flags ||
      u16(offset + 8) !== method ||
      u16(offset + 26) !== nameLength ||
      u16(offset + 28)
    )
      throw invalid()
    const dataStart = offset + 30 + nameLength
    check(dataStart, size)
    if (decode.decode(bytes.subarray(offset + 30, dataStart)) !== name)
      throw invalid()
    const payload = bytes.subarray(dataStart, dataStart + size)
    let dataEnd = dataStart + size
    if (flags & 8) {
      if (
        u32(dataEnd) !== 0x08074b50 ||
        u32(dataEnd + 4) !== crc ||
        u32(dataEnd + 8) !== size ||
        u32(dataEnd + 12) !== size
      )
        throw invalid()
      dataEnd += 16
    } else if (
      u32(offset + 14) !== crc ||
      u32(offset + 18) !== size ||
      u32(offset + 22) !== size
    )
      throw invalid()
    if (dataEnd > centralOffset || crc32(payload) !== crc) throw invalid()
    ranges.push({ start: offset, end: dataEnd })
    files.set(name, payload)
    cursor += 46 + nameLength
  }
  if (cursor !== end) throw invalid()
  ranges.sort((a, b) => a.start - b.start)
  let offset = 0
  for (const range of ranges) {
    if (range.start !== offset) throw invalid()
    offset = range.end
  }
  if (offset !== centralOffset) throw invalid()
  return files
}

type ImageDecoder = (
  blob: Blob,
) => Promise<{ width: number; height: number; close: () => void }>
export async function validateBackup(
  buffer: ArrayBuffer,
  decodeImage: ImageDecoder = (blob) => createImageBitmap(blob),
): Promise<BackupData> {
  const files = readStoredZip(buffer)
  const json = files.get('backup.json')
  if (!json) throw new Error('Backup metadata is missing.')
  const metadata = backupSchema.parse(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json)),
  )
  const unique = (ids: string[]) => {
    const set = new Set(ids)
    if (set.size !== ids.length) throw new Error('Duplicate records.')
    return set
  }
  const listIds = unique(metadata.lists.map((list) => list.id))
  unique(metadata.items.map((item) => item.id))
  unique(metadata.history.map((entry) => entry.id))
  const assetIds = unique(metadata.assets.map((asset) => asset.id))
  if (
    metadata.profile === null &&
    (metadata.lists.length ||
      metadata.items.length ||
      metadata.history.length ||
      metadata.assets.length)
  )
    throw new Error('A profile is required.')
  const references = metadata.items.flatMap((item) =>
    item.photoId ? [item.photoId] : [],
  )
  if (metadata.profile?.photoId) references.push(metadata.profile.photoId)
  const referencesSet = unique(references)
  if (
    assetIds.size !== referencesSet.size ||
    references.some((id) => !assetIds.has(id))
  )
    throw new Error('Image references do not match.')
  if (metadata.items.some((item) => !listIds.has(item.listId)))
    throw new Error('Item parent is missing.')
  if (files.size !== metadata.assets.length + 1)
    throw new Error('Unexpected files in backup.')
  const assets: ImageAsset[] = []
  for (const meta of metadata.assets) {
    const payload = files.get(assetPath(meta))
    if (payload?.length !== meta.byteLength)
      throw new Error('Image size does not match.')
    const webp =
      payload.length >= 12 &&
      new TextDecoder().decode(payload.subarray(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(payload.subarray(8, 12)) === 'WEBP'
    const jpeg =
      payload[0] === 0xff && payload[1] === 0xd8 && payload[2] === 0xff
    if (meta.mime === 'image/webp' ? !webp : !jpeg)
      throw new Error('Image format does not match.')
    const asset = imageAssetSchema.parse({
      ...meta,
      blob: new Blob([payload], { type: meta.mime }),
    })
    const image = await decodeImage(asset.blob)
    try {
      if (image.width !== meta.width || image.height !== meta.height)
        throw new Error('Image dimensions do not match.')
    } finally {
      image.close()
    }
    if (
      metadata.profile?.photoId === meta.id &&
      (meta.width > 256 || meta.height > 256 || meta.byteLength > 128 * 1024)
    )
      throw new Error('Avatar exceeds its limits.')
    assets.push(asset)
  }
  return { metadata, assets }
}
