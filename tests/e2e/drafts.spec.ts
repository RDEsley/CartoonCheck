import { expect, test } from '@playwright/test'
test('recovers an unsaved quick-add draft after reload without writing it automatically', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Nome do item').fill('Rascunho do Switch')
  await page.reload()
  await expect(
    page.getByRole('checkbox', { name: /Rascunho do Switch/ }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Retomar edição', exact: true })
    .click()
  await expect(page.getByLabel('Nome do item')).toHaveValue(
    'Rascunho do Switch',
  )
  await page.getByLabel('Nome do item').press('Enter')
  await expect(page.getByLabel('Nome do item')).toHaveValue('')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Comprar Rascunho do Switch',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Retomar edição', exact: true }),
  ).toHaveCount(0)
})
