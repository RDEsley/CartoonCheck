import { expect, test } from '@playwright/test'
test('works offline after precaching, including previously unopened backup and restore', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  // The preview server applies the hosting headers; nothing the app does may
  // be refused by its content security policy.
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text()))
      errors.push(message.text())
  })
  const response = await page.goto('/app')
  expect(response?.headers()['content-security-policy']).toContain(
    "default-src 'self'",
  )
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await expect(
    page.getByText('✓ Pronto para usar offline', { exact: true }),
  ).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Nome do item').fill('Nintendo Switch 2')
  await page.getByLabel('Nome do item').press('Enter')
  await expect(page.getByLabel('Nome do item')).toHaveValue('')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Dispensar aviso' }).click()
  await context.setOffline(true)
  // Routes keep working offline when they carry a query string.
  await page.goto('/app?new=1')
  await expect(page.getByRole('dialog', { name: 'Nova lista' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.goto('/?origem=convite')
  await expect(
    page.getByRole('link', { name: /Abrir Cartoon Check/ }),
  ).toBeVisible()
  await page.getByRole('link', { name: /Abrir Cartoon Check/ }).click()
  await page.getByRole('link', { name: /Japão.*para comprar/ }).click()
  await page.reload()
  await page
    .getByRole('checkbox', { name: 'Comprar Nintendo Switch 2', exact: true })
    .click()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Comprar Nintendo Switch 2',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Histórico', exact: true }).click()
  await expect(page.getByText('Compra desfeita', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByText('Sakura', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sakura')
  await page.getByRole('link', { name: /Backup dos seus dados/ }).click()
  const downloading = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Exportar backup', exact: true })
    .click()
  const file = await (await downloading).path()
  await page.getByLabel('Escolher arquivo de backup').setInputFiles(file)
  await page.getByRole('button', { name: 'Substituir e restaurar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Olá, Richard 👋' }),
  ).toBeVisible()
  await page.getByRole('link', { name: /Japão.*para comprar/ }).click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Comprar Nintendo Switch 2',
      exact: true,
    }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
