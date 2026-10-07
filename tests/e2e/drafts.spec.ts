import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
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
async function listWithItem(page: Page) {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Nome do item').fill('Switch')
  await page.getByLabel('Nome do item').press('Enter')
  await expect(page.getByLabel('Nome do item')).toHaveValue('')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Dispensar aviso' }).click()
}
test('asks before discarding unsaved changes when a sheet is closed', async ({
  page,
}) => {
  await listWithItem(page)
  await page.getByRole('button', { name: 'Switch', exact: true }).click()
  // The text of a label that wraps a textarea includes what was typed.
  const note = page.getByRole('textbox', { name: 'Nota', exact: true })
  await note.fill('Comprar em Akihabara')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('alertdialog', { name: 'Descartar alterações?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(note).toHaveValue('Comprar em Akihabara')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page
    .getByRole('button', { name: 'Descartar alterações', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Retomar edição', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Switch', exact: true }).click()
  await expect(note).toHaveValue('')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('keeps a draft older than its data until it is saved elsewhere or discarded', async ({
  page,
}) => {
  await listWithItem(page)
  await page.getByRole('button', { name: 'Switch', exact: true }).click()
  await page.getByLabel('Nota', { exact: true }).fill('Rascunho antigo')
  await page.reload()
  await page
    .getByRole('checkbox', { name: 'Comprar Switch', exact: true })
    .click()
  const resume = page.getByRole('button', {
    name: 'Retomar edição',
    exact: true,
  })
  await resume.click()
  const sheet = page.getByRole('dialog', { name: 'Detalhes do item' })
  await expect(sheet.getByRole('alert')).toContainText(
    'Há um rascunho desta edição feito antes de os dados mudarem.',
  )
  await expect(
    sheet.getByRole('textbox', { name: 'Nota', exact: true }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await resume.click()
  await sheet.getByRole('button', { name: 'Descartar rascunho' }).click()
  await expect(
    sheet.getByRole('textbox', { name: 'Nota', exact: true }),
  ).toHaveValue('')
  await expect(
    sheet.getByRole('textbox', { name: 'Nome', exact: true }),
  ).toHaveValue('Switch')
})
