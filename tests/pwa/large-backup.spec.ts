import { stat } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const MiB = 1024 * 1024
// Fills the open list with items that each carry a real photo close to the
// 512 KiB limit, written straight into the database, until the photos add up
// to the requested size.
function seedPhotos(page: Page, bytes: number) {
  return page.evaluate(async (target) => {
    const listId = location.pathname.split('/').pop() ?? ''
    const encode = (side: number) =>
      new Promise<Blob>((resolve, reject) => {
        const canvas = document.createElement('canvas')
        canvas.width = side
        canvas.height = side
        const context = canvas.getContext('2d')
        if (context === null) {
          reject(new Error('Canvas unavailable'))
          return
        }
        // Noise does not compress, which makes the photo as heavy as allowed.
        const pixels = context.createImageData(side, side)
        for (let offset = 0; offset < pixels.data.length; offset += 4) {
          pixels.data[offset] = Math.random() * 255
          pixels.data[offset + 1] = Math.random() * 255
          pixels.data[offset + 2] = Math.random() * 255
          pixels.data[offset + 3] = 255
        }
        context.putImageData(pixels, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob === null) reject(new Error('Encoding failed'))
            else resolve(blob)
          },
          'image/webp',
          0.8,
        )
      })
    let side = 720
    let photo = await encode(side)
    while (photo.size > 512 * 1024) {
      side = Math.round(side * 0.9)
      photo = await encode(side)
    }
    const count = Math.ceil(target / photo.size)
    const connection = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('cartoon-check')
      opening.onsuccess = () => {
        resolve(opening.result)
      }
      opening.onerror = () => {
        reject(new Error('Database unavailable'))
      }
    })
    const transaction = connection.transaction(['items', 'assets'], 'readwrite')
    const start = Date.now()
    for (let index = 0; index < count; index++) {
      const photoId = crypto.randomUUID()
      transaction.objectStore('assets').add({
        id: photoId,
        blob: photo,
        mime: photo.type,
        width: side,
        height: side,
        byteLength: photo.size,
        createdAt: start,
      })
      transaction.objectStore('items').add({
        id: crypto.randomUUID(),
        listId,
        name: `Foto ${String(index + 1).padStart(3, '0')}`,
        status: 'pending',
        quantity: 1,
        plannedPriceMinor: null,
        paidPriceMinor: null,
        photoId,
        note: null,
        store: null,
        link: null,
        createdAt: start + index,
        updatedAt: start + index,
        purchasedAt: null,
        revision: 1,
      })
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onerror = () => {
        reject(new Error('Seeding failed'))
      }
    })
    connection.close()
    return { count, photoBytes: photo.size }
  }, bytes)
}
// 17 MiB crosses the 16 MiB line where the work moves to a background worker;
// 64 MiB is the largest backup the app is checked against.
for (const megabytes of [17, 64]) {
  test(`exports and restores ${String(megabytes)} MiB of photos through the worker`, async ({
    page,
  }) => {
    test.setTimeout(240_000)
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    await page.goto('/app')
    await page.getByLabel('Seu nome').fill('Richard')
    await page.getByRole('button', { name: 'Vamos começar' }).click()
    await page.getByRole('button', { name: 'Nova lista' }).click()
    await page.getByLabel('Nome da lista').fill('Japão')
    await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Japão')
    const seeded = await seedPhotos(page, megabytes * MiB)
    await page.goto('/app/settings/backup')
    const exporting = Date.now()
    const downloading = page.waitForEvent('download', { timeout: 120_000 })
    await page
      .getByRole('button', { name: 'Exportar backup', exact: true })
      .click()
    const file = await (await downloading).path()
    const exported = Date.now() - exporting
    const size = (await stat(file)).size
    expect(size).toBeGreaterThan(megabytes * MiB)
    const restoring = Date.now()
    await page.getByLabel('Escolher arquivo de backup').setInputFiles(file)
    await expect(
      page.getByText(`${String(seeded.count)} fotos`, { exact: false }),
    ).toBeVisible({ timeout: 120_000 })
    const validated = Date.now() - restoring
    await page.getByRole('button', { name: 'Substituir e restaurar' }).click()
    await expect(
      page.getByRole('heading', { name: 'Olá, Richard 👋' }),
    ).toBeVisible({ timeout: 120_000 })
    const restored = Date.now() - restoring
    await page.getByRole('link', { name: /Japão/ }).click()
    await expect(
      page.getByText(`${String(seeded.count)} para comprar`, { exact: false }),
    ).toBeVisible()
    await expect(page.locator('[data-item-list] img').first()).toBeVisible()
    test.info().annotations.push({
      type: 'measurement',
      description: `${(size / MiB).toFixed(1)} MiB backup with ${String(seeded.count)} photos: exported in ${String(exported)} ms, validated in ${String(validated)} ms, restored in ${String(restored)} ms`,
    })
    console.log(test.info().annotations.at(-1)?.description)
    expect(errors).toEqual([])
  })
}
