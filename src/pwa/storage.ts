export type Persistence = 'persisted' | 'best-effort' | 'unsupported'
export interface StorageState {
  persistence: Persistence
  usage: number | null
}
function supported() {
  return (
    'storage' in navigator && typeof navigator.storage.persist === 'function'
  )
}
/**
 * Asks the browser to keep local data out of its automatic cleanup. This is a
 * best effort: a refusal changes nothing in the app, and even a grant does not
 * protect against the user or the device clearing the data.
 */
export async function requestPersistence(): Promise<Persistence> {
  if (!supported()) return 'unsupported'
  try {
    if (await navigator.storage.persisted()) return 'persisted'
    return (await navigator.storage.persist()) ? 'persisted' : 'best-effort'
  } catch {
    return 'best-effort'
  }
}
export async function readStorageState(): Promise<StorageState> {
  if (!supported()) return { persistence: 'unsupported', usage: null }
  try {
    const [persisted, estimate] = await Promise.all([
      navigator.storage.persisted(),
      navigator.storage.estimate(),
    ])
    return {
      persistence: persisted ? 'persisted' : 'best-effort',
      usage: estimate.usage ?? null,
    }
  } catch {
    return { persistence: 'best-effort', usage: null }
  }
}
const megabytes = new Intl.NumberFormat('pt-BR', {
  style: 'unit',
  unit: 'megabyte',
  maximumFractionDigits: 1,
})
const kilobytes = new Intl.NumberFormat('pt-BR', {
  style: 'unit',
  unit: 'kilobyte',
  maximumFractionDigits: 0,
})
export function formatBytes(bytes: number) {
  return bytes < 100_000
    ? kilobytes.format(bytes / 1000)
    : megabytes.format(bytes / 1_000_000)
}
