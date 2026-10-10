import { expect, test } from '@playwright/test'

const free =
  '00020126580014br.gov.bcb.pix013635f6734f-2587-4139-8e9b-0ed7a4436a7a5204000053039865802BR5924RICHARD ESLEY S OLIVEIRA6008BRASILIA62160512CARTOONCHECK6304C34B'
const ten =
  '00020126580014br.gov.bcb.pix013635f6734f-2587-4139-8e9b-0ed7a4436a7a520400005303986540510.005802BR5924RICHARD ESLEY S OLIVEIRA6008BRASILIA62160512CARTOONCHECK630423A7'

test('shows the support, terms and privacy pages before a profile exists', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Apoiar', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Apoiar o Cartoon Check' }),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: 'QR Code do Pix' })).toBeVisible()
  const code = page.locator('code')
  await expect(code).toHaveText(free)
  await page.getByRole('button', { name: /^R\$\s10,00$/ }).click()
  await expect(code).toHaveText(ten)
  await expect(page.getByText(/^Valor: R\$\s10,00$/)).toBeVisible()

  // A dot is never taken for a thousands separator: the amount is refused and
  // the code falls back to the one without a value.
  await page.getByRole('button', { name: 'Outro valor' }).click()
  const amount = page.getByLabel('Valor em reais')
  await amount.fill('1.500')
  await expect(page.getByText(/Use só números/)).toBeVisible()
  await expect(code).toHaveText(free)
  await amount.fill('15,50')
  await expect(code).toContainText('5303986540515.505802BR')
  await page.getByRole('button', { name: 'Decidir no banco' }).click()
  await expect(code).toHaveText(free)

  await page.getByRole('link', { name: 'Termos de uso' }).click()
  await expect(
    page.getByRole('heading', { name: 'Termos de uso' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Privacidade', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Política de privacidade' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL('/')
})

test('opens the support page from the settings and returns to them', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('link', { name: /Apoiar o Cartoon Check/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Apoiar o Cartoon Check' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Voltar aos ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
  await page.getByRole('link', { name: 'Política de privacidade' }).click()
  await expect(
    page.getByRole('heading', { name: 'Política de privacidade' }),
  ).toBeVisible()
})
