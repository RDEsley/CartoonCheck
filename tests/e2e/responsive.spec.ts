import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const longName = 'Supercalifragilisticexpialidocious'.repeat(3)
// A mobile browser zooms out when content is wider than the screen, so the
// layout viewport is compared with the configured width as well.
async function expectNoHorizontalOverflow(page: Page, screen: string) {
  const expected = page.viewportSize()?.width ?? 0
  await expect
    .poll(async () => {
      const measured = await page.evaluate(() => {
        const root = document.documentElement
        const sheet = document.querySelector(
          '[role="dialog"], [role="alertdialog"]',
        )
        return {
          page: root.scrollWidth,
          viewport: innerWidth,
          sheet: sheet === null ? 0 : sheet.scrollWidth - sheet.clientWidth,
        }
      })
      return { screen, ...measured }
    })
    .toEqual({ screen, page: expected, viewport: expected, sheet: 0 })
}
for (const [width, height] of [
  [320, 568],
  [360, 800],
  [390, 844],
  [412, 915],
  [430, 932],
  [844, 390],
  [1440, 900],
] as const) {
  test.describe(`at ${String(width)}x${String(height)}`, () => {
    test.use({
      viewport: { width, height },
      isMobile: width < 1000,
      hasTouch: width < 1000,
    })
    test('fits long names, sheets and fixed bars without horizontal scrolling', async ({
      page,
    }) => {
      await page.goto('/')
      await expectNoHorizontalOverflow(page, 'landing')
      await page.goto('/app')
      await page.getByLabel('Seu nome').fill('Richard Oliveira de Nome Muito Comprido')
      await expectNoHorizontalOverflow(page, 'onboarding')
      await page.getByRole('button', { name: 'Vamos começar' }).click()
      await page.getByRole('button', { name: 'Nova lista' }).click()
      await page.getByLabel('Nome da lista').fill(longName)
      await page.getByText('Cotação manual (opcional)', { exact: true }).click()
      await expectNoHorizontalOverflow(page, 'new list sheet')
      await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
      await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
      const name = page.getByLabel('Nome do item')
      for (const item of [longName, 'KitKat']) {
        await name.fill(item)
        await name.press('Enter')
        await expect(name).toHaveValue('')
      }
      await expectNoHorizontalOverflow(page, 'quick add sheet')
      await page.getByRole('button', { name: 'Fechar', exact: true }).click()
      await expectNoHorizontalOverflow(page, 'list with the feedback bar')
      const bars = await page.evaluate(() =>
        ['nav[aria-label="Navegação principal"]', '[data-add-item]', 'aside[aria-label="Última ação"]'].map(
          (selector) => {
            const rectangle = document.querySelector(selector)?.getBoundingClientRect()
            return rectangle !== undefined && rectangle.left >= 0 && rectangle.right <= innerWidth
          },
        ),
      )
      expect(bars).toEqual([true, true, true])
      await page.getByRole('button', { name: longName, exact: true }).click()
      await expectNoHorizontalOverflow(page, 'item details sheet')
      await page.getByRole('button', { name: 'Fechar', exact: true }).click()
      await page.getByRole('link', { name: 'Histórico', exact: true }).click()
      await expect(page.getByText('Item adicionado').first()).toBeVisible()
      await expectNoHorizontalOverflow(page, 'history')
      await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
      await expectNoHorizontalOverflow(page, 'settings')
      await page.getByRole('link', { name: 'Listas', exact: true }).click()
      await expect(page.getByRole('link', { name: new RegExp(longName) })).toBeVisible()
      await expectNoHorizontalOverflow(page, 'home with a long list name')
    })
  })
}
