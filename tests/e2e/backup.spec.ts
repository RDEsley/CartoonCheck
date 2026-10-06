import { expect, test } from '@playwright/test'
test('exports and restores real photos and preserves current data when cancelled or invalid', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Nome do item').fill('Switch 2')
  await page.getByLabel('Nome do item').press('Enter')
  await expect(page.getByLabel('Nome do item')).toHaveValue('')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Dispensar aviso' }).click()
  await page.getByRole('button', { name: 'Switch 2', exact: true }).click()
  const photo = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    return canvas.toDataURL('image/png').split(',')[1] ?? ''
  })
  await page
    .getByLabel('Foto opcional')
    .setInputFiles({
      name: 'switch.png',
      mimeType: 'image/png',
      buffer: Buffer.from(photo, 'base64'),
    })
  await expect(page.getByRole('button', { name: 'Salvar item' })).toBeEnabled()
  await page.getByRole('button', { name: 'Salvar item' }).click()
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('link', { name: /Backup dos seus dados/ }).click()
  const downloading = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Exportar backup', exact: true })
    .click()
  const download = await downloading
  const path = await download.path()
  await page.getByLabel('Escolher arquivo de backup').setInputFiles(path)
  await expect(
    page.getByRole('alertdialog', { name: 'Restaurar estes dados?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar restauração' }).click()
  await page
    .getByLabel('Escolher arquivo de backup')
    .setInputFiles({
      name: 'invalid.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('bad backup'),
    })
  await expect(page.getByRole('alert')).toContainText('não é um backup válido')
  await page.getByLabel('Escolher arquivo de backup').setInputFiles(path)
  await expect(page.getByText(/Exportado em .* versão \d+\.\d+\.\d+/)).toBeVisible()
  const saving = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Exportar meus dados atuais antes' })
    .click()
  await saving
  await expect(
    page.getByText('Cópia dos dados atuais exportada.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Substituir e restaurar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Olá, Richard 👋' }),
  ).toBeVisible()
  await page.getByRole('link', { name: /Japão.*para comprar/ }).click()
  await expect(
    page.getByRole('checkbox', { name: 'Comprar Switch 2', exact: true }),
  ).toBeVisible()
  await expect(page.locator('[data-item-list] img')).toBeVisible()
  await expect(page.locator('.celebration-canvas')).toHaveCount(0)
})
