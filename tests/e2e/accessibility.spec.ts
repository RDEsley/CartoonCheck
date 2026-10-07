import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
async function audit(page: Page, screen: string) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  })
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    result.violations.map((violation) => ({
      screen,
      rule: violation.id,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    })),
  ).toEqual([])
}
test('keeps the public and first-use screens accessible', async ({ page }) => {
  await page.goto('/')
  await audit(page, 'landing')
  await page.getByRole('checkbox', { name: 'Experimentar um check' }).click()
  await audit(page, 'landing after the demo check')
  await page.getByRole('button', { name: 'Instalar', exact: true }).click()
  await audit(page, 'install guidance')
  await page.getByRole('button', { name: 'Entendi', exact: true }).click()
  await page.getByRole('link', { name: /Abrir Cartoon Check/ }).click()
  await audit(page, 'onboarding')
  await page.getByRole('link', { name: 'Já tenho um backup' }).click()
  await audit(page, 'restore before onboarding')
  await page.goto('/caminho-que-nao-existe')
  await audit(page, 'not found')
})
for (const theme of ['Comic Pop', 'Sakura', 'Night Cartoon']) {
  test(`keeps every app screen and dialog accessible in ${theme}`, async ({
    page,
  }) => {
    test.slow()
    await page.goto('/app')
    await page.getByLabel('Seu nome').fill('Richard')
    await page.getByRole('button', { name: 'Vamos começar' }).click()
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
    // Comic Pop is the default theme; the others are applied first.
    if (theme !== 'Comic Pop') {
      await page.getByText(theme, { exact: true }).click()
      await expect(
        page.getByRole('status').filter({ hasText: `Tema ${theme} aplicado!` }),
      ).toHaveCount(1)
    }
    await audit(page, 'settings')
    await page.getByRole('link', { name: /Seu perfil/ }).click()
    await audit(page, 'profile')
    await page.getByRole('link', { name: 'Voltar aos ajustes' }).click()
    await page.getByRole('link', { name: /Backup dos seus dados/ }).click()
    await expect(
      page.getByRole('heading', { name: 'Seus dados, com você.' }),
    ).toBeVisible()
    await audit(page, 'backup')
    await page.getByRole('link', { name: 'Listas', exact: true }).click()
    await audit(page, 'empty home')
    await page.getByRole('button', { name: 'Nova lista' }).click()
    await page.getByText('Cotação manual (opcional)', { exact: true }).click()
    await audit(page, 'new list sheet')
    await page.getByLabel('Nome da lista').fill('Japão')
    await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
    await audit(page, 'empty list')
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
    await audit(page, 'quick add sheet')
    const name = page.getByLabel('Nome do item')
    for (const item of ['Switch', 'KitKat']) {
      await name.fill(item)
      await name.press('Enter')
      await expect(name).toHaveValue('')
    }
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await audit(page, 'list with the feedback bar')
    await page.getByRole('button', { name: 'Switch', exact: true }).click()
    await audit(page, 'item details sheet')
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await page.getByRole('button', { name: 'Opções da lista' }).click()
    await audit(page, 'list options sheet')
    await page
      .getByRole('button', { name: 'Excluir lista', exact: true })
      .click()
    await audit(page, 'delete confirmation')
    await page.getByRole('button', { name: 'Manter lista' }).click()
    await page
      .getByRole('checkbox', { name: 'Comprar Switch', exact: true })
      .click()
    await page.getByRole('tab', { name: 'Comprei', exact: true }).click()
    await expect(
      page.getByRole('checkbox', { name: 'Desmarcar Switch', exact: true }),
    ).toBeVisible()
    await audit(page, 'purchased tab with undo')
    await page.getByRole('link', { name: 'Histórico', exact: true }).click()
    await expect(page.getByText('Comprado ✨', { exact: true })).toBeVisible()
    await audit(page, 'history')
    await page.getByRole('link', { name: 'Arquivo', exact: true }).click()
    await audit(page, 'empty archive')
    await page.getByRole('link', { name: 'Listas', exact: true }).click()
    await expect(page.getByRole('link', { name: /Japão/ })).toBeVisible()
    await audit(page, 'home with a list')
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.+/)
    await audit(page, 'themed landing')
  })
}
