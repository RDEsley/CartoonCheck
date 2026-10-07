import { expect, test } from '@playwright/test'
test('creates, edits, archives, reactivates and deletes a list', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Usar 🇯🇵' }).click()
  await page.getByLabel('Moeda', { exact: true }).selectOption('JPY')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '🇯🇵 Japão', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Editar lista' }).click()
  await page.getByLabel('Nome da lista').fill('Viagem ao Japão')
  await page.getByRole('button', { name: 'Salvar lista' }).click()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Arquivar lista' }).click()
  await expect(page.getByText('Lista arquivada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(page.getByText('Bora dar check?', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Arquivar lista' }).click()
  await expect(page.getByText('Lista arquivada', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Arquivo', exact: true }).click()
  await page.getByRole('link', { name: /Viagem ao Japão/ }).click()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Reativar lista' }).click()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Excluir lista', exact: true }).click()
  await page.getByRole('button', { name: 'Manter lista' }).click()
  await expect(
    page.getByRole('heading', { name: '🇯🇵 Viagem ao Japão', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Excluir lista', exact: true }).click()
  await page.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sua próxima lista começa aqui.' }),
  ).toBeVisible()
})
test('keeps an archived list readable and says what deleting it removes', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Nome do item').fill('Câmera')
  await page.getByLabel('Nome do item').press('Enter')
  await expect(page.getByLabel('Nome do item')).toHaveValue('')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Câmera', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Nota', exact: true })
    .fill('Comprar em Akihabara')
  await page
    .getByRole('textbox', { name: 'Link', exact: true })
    .fill('https://example.com/camera')
  await page.getByRole('button', { name: 'Salvar item', exact: true }).click()
  await page.getByRole('button', { name: 'Câmera', exact: true }).click()
  const link = page.getByRole('link', { name: 'Abrir example.com' })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Arquivar lista' }).click()
  await expect(
    page.getByRole('checkbox', { name: 'Comprar Câmera', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Câmera', exact: true }).click()
  const details = page.getByRole('dialog', { name: 'Câmera' })
  await expect(
    details.getByText('Comprar em Akihabara', { exact: true }),
  ).toBeVisible()
  await expect(
    details.getByRole('link', { name: 'Abrir example.com' }),
  ).toBeVisible()
  await expect(
    details.getByRole('button', { name: 'Salvar item' }),
  ).toHaveCount(0)
  await expect(details.getByRole('textbox')).toHaveCount(0)
  await details.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Excluir lista', exact: true }).click()
  await expect(
    page.getByRole('alertdialog', { name: 'Excluir esta lista?' }),
  ).toContainText(
    '“Japão” e seu item, com a foto se houver, serão excluídos. Esta ação não pode ser desfeita.',
  )
})
test('starts a finished list over for the next trip', async ({ page }) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Mercado')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await expect(
    page.getByRole('button', { name: 'Recomeçar lista' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  for (const name of ['Café', 'Pão']) {
    await page.getByLabel('Nome do item').fill(name)
    await page.getByLabel('Nome do item').press('Enter')
    await expect(page.getByLabel('Nome do item')).toHaveValue('')
  }
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  for (const name of ['Café', 'Pão'])
    await page
      .getByRole('checkbox', { name: `Comprar ${name}`, exact: true })
      .click()
  await expect(page.getByText('0 para comprar', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Opções da lista' }).click()
  await page.getByRole('button', { name: 'Recomeçar lista' }).click()
  await expect(
    page.getByRole('alertdialog', { name: 'Recomeçar esta lista?' }),
  ).toContainText('Os 2 itens comprados voltam para “Quero comprar”')
  await page.getByRole('button', { name: 'Recomeçar lista' }).click()
  await expect(page.getByText('2 para comprar', { exact: false })).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: 'Comprar Café', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Desfazer', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('link', { name: 'Histórico', exact: true }).click()
  await expect(
    page.getByText('Lista recomeçada', { exact: true }),
  ).toBeVisible()
})
