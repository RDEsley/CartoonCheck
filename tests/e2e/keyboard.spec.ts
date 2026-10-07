import { expect, test } from '@playwright/test'
test.use({
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
})
test('supports keyboard entry, titled screens and focus after sheets, purchases and undo', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByLabel('Seu nome').press('Enter')
  const create = page.getByRole('button', { name: 'Nova lista', exact: true })
  await create.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Nome da lista')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(create).toBeFocused()
  await page.keyboard.press('Enter')
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByLabel('Nome da lista').press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  // The title is focused for assistive technology and shows no focus ring.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS(
    'outline-style',
    'none',
  )
  await expect(page).toHaveTitle('Japão · Cartoon Check')
  const add = page.getByRole('button', { name: 'Adicionar', exact: true })
  await add.focus()
  await page.keyboard.press('Enter')
  const name = page.getByLabel('Nome do item')
  await expect(name).toBeFocused()
  for (const item of ['Switch', 'KitKat']) {
    await name.fill(item)
    await page.keyboard.press('Enter')
    await expect(name).toHaveValue('')
    await expect(name).toBeFocused()
  }
  await page.keyboard.press('Escape')
  await expect(add).toBeFocused()
  await page.getByRole('button', { name: 'Dispensar aviso' }).click()
  const first = page.getByRole('checkbox', {
    name: 'Comprar Switch',
    exact: true,
  })
  const second = page.getByRole('checkbox', {
    name: 'Comprar KitKat',
    exact: true,
  })
  await first.focus()
  await page.keyboard.press(' ')
  await expect(first).toHaveCount(0)
  await expect(second).toBeFocused()
  await page.keyboard.press(' ')
  await expect(second).toHaveCount(0)
  await expect(add).toBeFocused()
  await expect(
    page.getByRole('status').filter({ hasText: 'Lista completa!' }),
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'Desfazer', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(second).toBeFocused()
  await page.getByRole('tab', { name: 'Quero comprar', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Comprei', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('checkbox', { name: 'Desmarcar Switch', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Histórico', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Seu histórico' }),
  ).toBeFocused()
  await expect(page).toHaveTitle('Seu histórico · Cartoon Check')
})
