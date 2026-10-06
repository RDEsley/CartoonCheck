import { expect, test } from '@playwright/test'

test('creates a local profile through the interface and keeps it after reopening', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByRole('heading', { name: 'Como podemos te chamar?' })).toBeVisible()
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('radio', { name: 'Estrela' }).check({ force: true })
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Richard 👋' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Olá, Richard 👋' })).toBeVisible()
  await page.getByRole('link', { name: 'Arquivo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Listas arquivadas' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
