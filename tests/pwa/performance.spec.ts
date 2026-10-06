import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
// Writes items straight into the app's database: seeding through the interface
// would take longer than the measurement itself.
async function seedItems(page: Page, count: number) {
  await page.evaluate(async (total) => {
    const listId = location.pathname.split('/').pop() ?? ''
    const connection = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('cartoon-check')
      opening.onsuccess = () => {
        resolve(opening.result)
      }
      opening.onerror = () => {
        reject(new Error('Database unavailable'))
      }
    })
    const transaction = connection.transaction('items', 'readwrite')
    const items = transaction.objectStore('items')
    const start = Date.now()
    for (let index = 0; index < total; index++)
      items.add({
        id: crypto.randomUUID(),
        listId,
        name: `Item ${String(index + 1).padStart(4, '0')}`,
        status: 'pending',
        quantity: 1,
        plannedPriceMinor: null,
        paidPriceMinor: null,
        photoId: null,
        note: null,
        store: null,
        link: null,
        createdAt: start + index,
        updatedAt: start + index,
        purchasedAt: null,
        revision: 1,
      })
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onerror = () => {
        reject(new Error('Seeding failed'))
      }
    })
    connection.close()
  }, count)
}
// Clicks the first pending item and measures until its card leaves the list.
function purchaseLatency(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const list = document.querySelector('[data-item-list]')
        const box = list?.querySelector<HTMLElement>('[role="checkbox"]')
        const card = box?.closest('li')
        if (!list || !box || !card) {
          reject(new Error('No pending item'))
          return
        }
        const start = performance.now()
        const observer = new MutationObserver(() => {
          if (card.isConnected) return
          observer.disconnect()
          resolve(performance.now() - start)
        })
        observer.observe(list, { childList: true })
        box.click()
      }),
  )
}
function idleFrames(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const original = window.requestAnimationFrame.bind(window)
        let frames = 0
        window.requestAnimationFrame = (callback) => {
          frames++
          return original(callback)
        }
        setTimeout(() => {
          window.requestAnimationFrame = original
          resolve(frames)
        }, 1000)
      }),
  )
}
for (const count of [200, 1000]) {
  test(`stays responsive with ${String(count)} items in a list`, async ({
    page,
  }) => {
    test.slow()
    await page.goto('/app')
    await page.getByLabel('Seu nome').fill('Richard')
    await page.getByRole('button', { name: 'Vamos começar' }).click()
    await page.getByRole('button', { name: 'Nova lista' }).click()
    await page.getByLabel('Nome da lista').fill('Japão')
    await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Japão')
    await seedItems(page, count)
    const opening = Date.now()
    await page.reload()
    await expect(
      page.getByRole('checkbox', { name: 'Comprar Item 0001', exact: true }),
    ).toBeVisible()
    const opened = Date.now() - opening
    await expect(
      page.getByText(`${String(count)} para comprar`, { exact: false }),
    ).toBeVisible()
    const cards = page.locator('[data-item-list] > li')
    const rendered = await cards.count()
    // Only the cards near the screen exist; the rest appear while scrolling.
    expect(rendered).toBeLessThanOrEqual(120)
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await expect.poll(() => cards.count()).toBeGreaterThan(rendered)
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
    const latencies: number[] = []
    for (let index = 0; index < 10; index++)
      latencies.push(await purchaseLatency(page))
    latencies.sort((a, b) => a - b)
    const slowest = latencies[latencies.length - 1] ?? 0
    await expect(
      page.getByText(`${String(count - 10)} para comprar`, { exact: false }),
    ).toBeVisible()
    await expect(
      page.locator('.celebration-canvas, .purchase-ghost'),
    ).toHaveCount(0, { timeout: 5000 })
    const frames = await idleFrames(page)
    // A processor four times slower stands in for a mid-range phone.
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const throttled: number[] = []
    for (let index = 0; index < 5; index++)
      throttled.push(await purchaseLatency(page))
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    throttled.sort((a, b) => a - b)
    const slowestThrottled = throttled[throttled.length - 1] ?? 0
    test.info().annotations.push({
      type: 'measurement',
      description: `${String(count)} items: list ready in ${String(opened)} ms, ${String(rendered)} cards rendered, purchase median ${String(Math.round(latencies[4] ?? 0))} ms and slowest ${String(Math.round(slowest))} ms, with the processor 4x slower median ${String(Math.round(throttled[2] ?? 0))} ms and slowest ${String(Math.round(slowestThrottled))} ms, ${String(frames)} idle frames`,
    })
    console.log(test.info().annotations.at(-1)?.description)
    expect(opened).toBeLessThan(5000)
    expect(slowest).toBeLessThan(1000)
    expect(slowestThrottled).toBeLessThan(2000)
    expect(frames).toBe(0)
  })
}
// A first visit on a slow phone profile: the network and processor limits are
// the ones Lighthouse uses for its mobile runs.
for (const path of ['/', '/app']) {
  test(`shows the first screen of ${path} within the loading budget`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    })
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const vitals = await page.evaluate(
      () =>
        new Promise<{ paint: number; shift: number }>((resolve) => {
          let paint = 0
          let shift = 0
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) paint = entry.startTime
          }).observe({ type: 'largest-contentful-paint', buffered: true })
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const moved = entry as PerformanceEntry & {
                value: number
                hadRecentInput: boolean
              }
              if (!moved.hadRecentInput) shift += moved.value
            }
          }).observe({ type: 'layout-shift', buffered: true })
          setTimeout(() => {
            resolve({ paint, shift })
          }, 2000)
        }),
    )
    await context.close()
    test.info().annotations.push({
      type: 'measurement',
      description: `${path}: largest contentful paint at ${String(Math.round(vitals.paint))} ms, layout shift ${vitals.shift.toFixed(3)}`,
    })
    console.log(test.info().annotations.at(-1)?.description)
    expect(vitals.paint).toBeGreaterThan(0)
    expect(vitals.paint).toBeLessThanOrEqual(2500)
    expect(vitals.shift).toBeLessThanOrEqual(0.1)
  })
}
