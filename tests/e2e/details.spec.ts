import { expect, test } from '@playwright/test'
test('saves compressed photos, total item prices and manual currency conversion', async ({ page }) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('combobox', { name: 'Moeda', exact: true }).selectOption('JPY')
  await page.getByText('Cotação manual (opcional)', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Moeda secundária' }).selectOption('BRL')
  await page.getByLabel('1 JPY vale quantos BRL?').fill('0')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Informe uma cotação maior que zero')
  await expect(page.getByLabel('1 JPY vale quantos BRL?')).toBeFocused()
  await expect(page.getByLabel('1 JPY vale quantos BRL?')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('1 JPY vale quantos BRL?').fill('0,035')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Nome do item').fill('Câmera')
  await page.getByLabel('Nome do item').press('Enter')
  await expect(page.getByLabel('Nome do item')).toHaveValue('')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Dispensar aviso' }).click()
  await page.getByRole('button', { name: 'Câmera', exact: true }).click()
  await page.getByLabel('Quantidade', { exact: true }).fill('2')
  await page.getByLabel('Preço planejado (JPY)').fill('12,5')
  await page.getByRole('button', { name: 'Salvar item', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Este preço tem casas decimais demais para a moeda da lista.')
  await expect(page.getByLabel('Preço planejado (JPY)')).toBeFocused()
  await expect(page.getByLabel('Preço planejado (JPY)')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Preço planejado (JPY)').fill('10000')
  await page.getByLabel('Preço pago (JPY)').fill('9000')
  await page.getByLabel('Nota', { exact: true }).fill('Comprar em Akihabara')
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2000; canvas.height = 1500
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Canvas unavailable')
    context.fillStyle = '#edb4c3'; context.fillRect(0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png').split(',')[1] ?? ''
  })
  await page.getByLabel('Foto opcional').setInputFiles({ name: 'camera.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })
  await expect(page.locator('[role="dialog"] img')).toBeVisible()
  await page.getByLabel('Foto opcional').setInputFiles({ name: 'notes.png', mimeType: 'image/png', buffer: Buffer.from('this is not an image') })
  await expect(page.getByRole('alert')).toHaveText('Esta foto não é JPEG, PNG ou WebP. Escolha outro arquivo.')
  await expect(page.locator('[role="dialog"] img')).toBeVisible()
  const huge = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x27, 0x10, 0, 0, 0x27, 0x10, 8, 6, 0, 0, 0]), Buffer.alloc(64)])
  await page.getByLabel('Foto opcional').setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: huge })
  await expect(page.getByRole('alert')).toHaveText('Esta foto passa de 40 megapixels. Escolha uma imagem menor.')
  await expect(page.getByRole('button', { name: 'Salvar item' })).toBeEnabled()
  await page.getByRole('button', { name: 'Salvar item', exact: true }).click()
  await expect(page.getByText(/Planejado:.*10.000/)).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-item-list] img')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Comprar Câmera', exact: true }).click()
  await expect(page.getByText(/Pago ≈.*315,00/)).toBeVisible()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.locator('[data-item-list] img')).toBeVisible()
})
test('reads the size of images encoded by the browser without decoding them', async ({ page }) => {
  await page.goto('/app')
  const sizes = await page.evaluate(async () => {
    const path = '/src/features/items/image-header.ts'
    const module = (await import(path)) as typeof import('../../src/features/items/image-header')
    const canvas = document.createElement('canvas')
    canvas.width = 321
    canvas.height = 123
    canvas.getContext('2d')?.fillRect(0, 0, 100, 100)
    const read = (type: string) =>
      new Promise<unknown>((resolve) => {
        canvas.toBlob((blob) => {
          void blob?.arrayBuffer().then((buffer) => {
            resolve(module.readImageHeader(new Uint8Array(buffer)))
          })
        }, type, 0.8)
      })
    return [await read('image/png'), await read('image/jpeg'), await read('image/webp')]
  })
  expect(sizes).toEqual([
    { mime: 'image/png', width: 321, height: 123 },
    { mime: 'image/jpeg', width: 321, height: 123 },
    { mime: 'image/webp', width: 321, height: 123 },
  ])
})
