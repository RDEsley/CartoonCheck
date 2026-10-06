export interface ImageHeader {
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
  width: number
  height: number
}
/**
 * Reads the real type and pixel size from the bytes of a file, without decoding
 * it. Returns null for anything that is not a JPEG, PNG or WebP image, or when
 * the given bytes end before the size is found.
 */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const has = (offset: number, text: string) =>
    bytes.length >= offset + text.length &&
    Array.from(text).every(
      (character, index) => bytes[offset + index] === character.charCodeAt(0),
    )
  const sized = (
    mime: ImageHeader['mime'],
    width: number,
    height: number,
  ): ImageHeader | null =>
    width > 0 && height > 0 ? { mime, width, height } : null
  if (
    bytes.length >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a &&
    has(12, 'IHDR')
  )
    return sized('image/png', view.getUint32(16), view.getUint32(20))
  if (has(0, 'RIFF') && has(8, 'WEBP')) {
    if (bytes.length < 30) return null
    const uint24 = (offset: number) =>
      view.getUint16(offset, true) | ((bytes[offset + 2] ?? 0) << 16)
    if (has(12, 'VP8X'))
      return sized('image/webp', uint24(24) + 1, uint24(27) + 1)
    if (has(12, 'VP8L') && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true)
      return sized(
        'image/webp',
        (bits & 0x3fff) + 1,
        ((bits >>> 14) & 0x3fff) + 1,
      )
    }
    if (
      has(12, 'VP8 ') &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    )
      return sized(
        'image/webp',
        view.getUint16(26, true) & 0x3fff,
        view.getUint16(28, true) & 0x3fff,
      )
    return null
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  // JPEG: walk the segments until a frame header, which carries the size.
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1] ?? 0
    if (marker === 0xff) {
      offset++
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return null
    const length = view.getUint16(offset + 2)
    if (length < 2) return null
    const frame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    if (frame)
      return offset + 9 <= bytes.length
        ? sized(
            'image/jpeg',
            view.getUint16(offset + 7),
            view.getUint16(offset + 5),
          )
        : null
    offset += 2 + length
  }
  return null
}
