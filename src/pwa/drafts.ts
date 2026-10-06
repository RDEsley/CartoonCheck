import { z } from 'zod'
import { imageAssetSchema } from '../db/models'
import type { ImageAsset } from '../db/models'
const key = 'cartoon-check:draft:v1'
const photoKey = 'cartoon-check:draft-photo:v1'
const schema = z.strictObject({
  version: z.literal(1),
  scope: z.string().max(120),
  epoch: z.uuid(),
  revision: z.number().int().nonnegative(),
  route: z
    .string()
    .max(256)
    .refine((value) => /^\/(?:app(?:[/?].*)?|onboarding)$/.test(value)),
  fields: z.record(z.string().max(40), z.string().max(4000)),
})
export type Draft = z.infer<typeof schema>
const listeners = new Set<() => void>()
let failed = false
let photoFailed = false
let memoryPhoto: { scope: string; asset: ImageAsset } | null = null
let current: Draft | null = null
try {
  const stored = sessionStorage.getItem(key)
  if (stored) {
    const parsed = schema.safeParse(JSON.parse(stored))
    if (parsed.success) current = parsed.data
  }
} catch {
  failed = true
}
let snapshot = { draft: current, failed }
function notify() {
  snapshot = { draft: current, failed }
  for (const listener of listeners) listener()
}
export function subscribeDraft(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getDraftSnapshot() {
  return snapshot
}
export function initialDraftField(
  scope: string,
  epoch: string,
  revision: number,
  field: string,
  fallback: string,
) {
  return current?.scope === scope &&
    current.epoch === epoch &&
    current.revision === revision
    ? (current.fields[field] ?? fallback)
    : fallback
}
export function checkpointDraft(draft: Draft) {
  const value = schema.parse(draft)
  if (JSON.stringify(current) === JSON.stringify(value) && !failed) return
  current = value
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
    failed = photoFailed && value.fields.photo === 'replace'
  } catch {
    failed = true
  }
  notify()
}
export function discardDraft(scope?: string) {
  if (scope !== undefined && current?.scope !== scope) return
  try {
    sessionStorage.removeItem(key)
    sessionStorage.removeItem(photoKey)
    current = null
    memoryPhoto = null
    photoFailed = false
    failed = false
  } catch {
    failed = true
  }
  notify()
}
export function draftIsSafe() {
  return !failed
}
export async function checkpointPhoto(scope: string, asset: ImageAsset) {
  memoryPhoto = { scope, asset }
  const bytes = new Uint8Array(await asset.blob.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  try {
    sessionStorage.setItem(
      photoKey,
      JSON.stringify({
        scope,
        id: asset.id,
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
        byteLength: asset.byteLength,
        createdAt: asset.createdAt,
        base64: btoa(binary),
      }),
    )
  } catch {
    photoFailed = true
    failed = true
    notify()
  }
}
const photoSchema = z.strictObject({
  scope: z.string().max(120),
  id: z.uuid(),
  mime: z.enum(['image/webp', 'image/jpeg']),
  width: z.number().int().min(1).max(1280),
  height: z.number().int().min(1).max(1280),
  byteLength: z
    .number()
    .int()
    .min(1)
    .max(512 * 1024),
  createdAt: z.number().int().nonnegative(),
  base64: z.string().max(700000),
})
export async function downloadDraft() {
  let photo: unknown
  if (memoryPhoto !== null && memoryPhoto.scope === current?.scope) {
    const asset = memoryPhoto.asset
    const bytes = new Uint8Array(await asset.blob.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    photo = {
      id: asset.id,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      byteLength: asset.byteLength,
      createdAt: asset.createdAt,
      base64: btoa(binary),
    }
  } else {
    try {
      photo = JSON.parse(sessionStorage.getItem(photoKey) ?? 'null')
    } catch {
      photo = null
    }
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ draft: current, photo }, null, 2)], {
      type: 'application/json',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'cartoon-check-rascunho.json'
  link.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
export function initialDraftPhoto(
  scope: string,
  epoch: string,
  revision: number,
): ImageAsset | null | undefined {
  const mode = initialDraftField(scope, epoch, revision, 'photo', 'keep')
  if (mode === 'remove') return null
  if (mode !== 'replace') return undefined
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(photoKey) ?? 'null')
    const stored = photoSchema.parse(raw)
    if (stored.scope !== scope) return undefined
    const bytes = Uint8Array.from(atob(stored.base64), (character) =>
      character.charCodeAt(0),
    )
    return imageAssetSchema.parse({
      id: stored.id,
      blob: new Blob([bytes], { type: stored.mime }),
      mime: stored.mime,
      width: stored.width,
      height: stored.height,
      byteLength: stored.byteLength,
      createdAt: stored.createdAt,
    })
  } catch {
    failed = true
    return undefined
  }
}
