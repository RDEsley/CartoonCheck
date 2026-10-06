import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
// Reads the stored profile directly, so a test can wait for a change to be saved.
function storedProfile(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
        const opening = indexedDB.open('cartoon-check')
        opening.onerror = () => {
          reject(new Error('Database unavailable'))
        }
        opening.onsuccess = () => {
          const connection = opening.result
          const reading = connection
            .transaction('profile')
            .objectStore('profile')
            .getAll()
          reading.onsuccess = () => {
            connection.close()
            resolve((reading.result as Record<string, unknown>[])[0])
          }
        }
      }),
  )
}
test('persists theme, motion preferences and profile edits', async ({ page }) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await expect(page.getByText(/O Cartoon Check ocupa .+ neste dispositivo/)).toBeVisible()
  await expect(page.getByText(/^Versão \d+\.\d+\.\d+/)).toBeVisible()
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fff8eb')
  await page.getByText('Sakura', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sakura')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fff5f0')
  // Three changes in a row, without waiting for one to be saved before the next.
  await page.getByLabel('Reduzir animações', { exact: true }).check()
  await page.getByLabel('Vibração sutil', { exact: true }).uncheck()
  await page.getByText('Comic Pop', { exact: true }).click()
  await expect(page.getByLabel('Reduzir animações', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Vibração sutil', { exact: true })).not.toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
  await expect
    .poll(() => storedProfile(page))
    .toMatchObject({ reduceMotion: true, hapticsEnabled: false, themeId: 'comic-pop' })
  await page.getByText('Sakura', { exact: true }).click()
  await expect.poll(() => storedProfile(page)).toMatchObject({ themeId: 'sakura' })
  await page.reload()
  await expect(page.getByLabel('Reduzir animações', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Vibração sutil', { exact: true })).not.toBeChecked()
  await page.getByLabel('Vibração sutil', { exact: true }).focus()
  await page.keyboard.press(' ')
  await expect(page.getByLabel('Vibração sutil', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Vibração sutil', { exact: true })).toBeFocused()
  await page.getByRole('radio', { name: 'Sakura' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night-cartoon')
  await expect(page.getByRole('radio', { name: 'Night Cartoon' })).toBeFocused()
  await page.getByText('Night Cartoon', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night-cartoon')
  await page.getByRole('link', { name: /Seu perfil/ }).click()
  await page.getByLabel('Seu nome').fill('Richard Oliveira')
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await page.getByRole('link', { name: 'Listas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Richard Oliveira 👋' })).toBeVisible()
})
