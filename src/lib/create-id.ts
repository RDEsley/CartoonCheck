export function createId(): string {
  if (typeof globalThis.crypto === 'undefined') {
    throw new Error('Secure random generation is unavailable.')
  }
  const secureCrypto = globalThis.crypto

  if (typeof secureCrypto.randomUUID === 'function') {
    return secureCrypto.randomUUID()
  }

  if (typeof secureCrypto.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable.')
  }

  const bytes = secureCrypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}
