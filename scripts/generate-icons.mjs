import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
const svg = await readFile(
  new URL('../public/icon.svg', import.meta.url),
  'utf8',
)
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [name, size, maskable] of [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, false],
  ]) {
    const encoded = await page.evaluate(
      async ({ svg, size, maskable }) => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (context === null) throw new Error('Canvas unavailable')
        context.fillStyle = '#fff8eb'
        context.fillRect(0, 0, size, size)
        const url = URL.createObjectURL(
          new Blob([svg], { type: 'image/svg+xml' }),
        )
        try {
          const image = new Image()
          image.src = url
          await image.decode()
          const inset = maskable ? size * 0.18 : 0
          context.drawImage(
            image,
            inset,
            inset,
            size - inset * 2,
            size - inset * 2,
          )
          return canvas.toDataURL('image/png').split(',')[1]
        } finally {
          URL.revokeObjectURL(url)
        }
      },
      { svg, size, maskable },
    )
    if (!encoded) throw new Error('Icon rendering failed')
    await writeFile(
      new URL(`../public/${name}`, import.meta.url),
      Buffer.from(encoded, 'base64'),
    )
  }
} finally {
  await browser.close()
}
