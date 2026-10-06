import { expect, test } from '@playwright/test'
test.use({ baseURL: 'http://127.0.0.1:4175' })
test('blocks updates while another tab is active and recovers an unsaved profile draft', async ({
  page,
  context,
  request,
}) => {
  await request.post('/__release/a')
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await expect(
    page.getByText('✓ Pronto para usar offline', { exact: true }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true)
  await page.getByRole('link', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('link', { name: /Seu perfil/ }).click()
  await page.getByLabel('Seu nome').fill('Richard viagem')
  const other = await context.newPage()
  await other.goto('/app')
  await expect(
    other.getByRole('heading', { name: 'Olá, Richard 👋' }),
  ).toBeVisible()
  await request.post('/__release/b')
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) throw new Error('Registration missing')
    await registration.update()
  })
  await page
    .getByRole('button', { name: 'Atualizar Cartoon Check', exact: true })
    .click()
  await expect(
    page.getByText(/Feche outras abas do Cartoon Check e tente novamente/),
  ).toBeVisible()
  await expect(page.getByLabel('Seu nome')).toHaveValue('Richard viagem')
  await other.close()
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Atualizar Cartoon Check', exact: true }).click()])
  await expect(page.getByLabel('Seu nome')).toHaveValue('Richard viagem')
  expect(await page.content()).toContain('cartoon-check-test-release-b')
  await page.getByRole('link', { name: 'Listas', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Olá, Richard 👋' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Retomar edição', exact: true })
    .click()
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await page.getByRole('link', { name: 'Listas', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Olá, Richard viagem 👋' }),
  ).toBeVisible()
})
