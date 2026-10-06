// @vitest-environment node
import { expect, it } from 'vitest'
import { readImageHeader } from './image-header'

const text = (value: string) =>
  Array.from(value, (character) => character.charCodeAt(0))
const be16 = (value: number) => [value >>> 8, value & 255]
const be32 = (value: number) => [...be16(value >>> 16), ...be16(value & 65535)]
const le16 = (value: number) => [value & 255, value >>> 8]
const le24 = (value: number) => [...le16(value & 65535), value >>> 16]
const le32 = (value: number) => [...le16(value & 65535), ...le16(value >>> 16)]
const riff = (chunk: string, payload: number[]) =>
  Uint8Array.from([
    ...text('RIFF'),
    ...le32(4 + 8 + payload.length),
    ...text('WEBP'),
    ...text(chunk),
    ...le32(payload.length),
    ...payload,
  ])

it('reads the size of a PNG from its header chunk', () => {
  const png = Uint8Array.from([
    0x89, ...text('PNG'), 0x0d, 0x0a, 0x1a, 0x0a,
    ...be32(13), ...text('IHDR'), ...be32(8000), ...be32(6000),
    8, 6, 0, 0, 0,
  ])
  expect(readImageHeader(png)).toEqual({
    mime: 'image/png',
    width: 8000,
    height: 6000,
  })
})
it('skips metadata segments to find the JPEG frame size', () => {
  const metadata = [0xff, 0xe1, ...be16(2 + 300), ...new Array<number>(300).fill(0)]
  const frame = [0xff, 0xc2, ...be16(17), 8, ...be16(3000), ...be16(4000), 3]
  const jpeg = Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, ...be16(16), ...text('JFIF'), ...new Array<number>(10).fill(0),
    ...metadata,
    ...frame,
    ...new Array<number>(12).fill(0),
  ])
  expect(readImageHeader(jpeg)).toEqual({
    mime: 'image/jpeg',
    width: 4000,
    height: 3000,
  })
  expect(readImageHeader(jpeg.subarray(0, 40))).toBeNull()
})
it('reads the three WebP encodings', () => {
  const lossy = riff('VP8 ', [
    0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(1280), ...le16(720), 0, 0,
  ])
  const lossless = riff('VP8L', [
    0x2f, ...le32((640 - 1) | ((480 - 1) << 14)), 0, 0, 0, 0, 0,
  ])
  const extended = riff('VP8X', [
    0, 0, 0, 0, ...le24(5000 - 1), ...le24(7000 - 1),
  ])
  expect(readImageHeader(lossy)).toEqual({
    mime: 'image/webp',
    width: 1280,
    height: 720,
  })
  expect(readImageHeader(lossless)).toEqual({
    mime: 'image/webp',
    width: 640,
    height: 480,
  })
  expect(readImageHeader(extended)).toEqual({
    mime: 'image/webp',
    width: 5000,
    height: 7000,
  })
})
it('rejects other formats, truncated files and images without pixels', () => {
  expect(readImageHeader(new Uint8Array())).toBeNull()
  expect(readImageHeader(Uint8Array.from(text('GIF89a')))).toBeNull()
  expect(readImageHeader(Uint8Array.from(text('<svg xmlns=')))).toBeNull()
  expect(
    readImageHeader(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2])),
  ).toBeNull()
  const empty = Uint8Array.from([
    0x89, ...text('PNG'), 0x0d, 0x0a, 0x1a, 0x0a,
    ...be32(13), ...text('IHDR'), ...be32(0), ...be32(10),
  ])
  expect(readImageHeader(empty)).toBeNull()
})
