import { expect, test } from '@playwright/test'
test('keeps the feedback bar below open sheets and clear of the last row', async ({
  page,
}) => {
  await page.goto('/app')
  await page.getByLabel('Seu nome').fill('Richard')
  await page.getByRole('button', { name: 'Vamos começar' }).click()
  await page.getByRole('button', { name: 'Nova lista' }).click()
  await page.getByLabel('Nome da lista').fill('Japão')
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  const name = page.getByLabel('Nome do item')
  for (let index = 1; index <= 10; index++) {
    await name.fill(`Lembrança ${String(index)}`)
    await name.press('Enter')
    await expect(name).toHaveValue('')
  }
  const bar = page.getByRole('complementary', {
    name: 'Última ação',
    includeHidden: true,
  })
  const layers = await page.evaluate(() => {
    const layer = (selector: string) => {
      const element = document.querySelector(selector)
      if (element === null) throw new Error(`Missing ${selector}`)
      return Number(getComputedStyle(element).zIndex)
    }
    return {
      bar: layer('aside[aria-label="Última ação"]'),
      sheet: layer('[role="dialog"]'),
    }
  })
  expect(layers.bar).toBeLessThan(layers.sheet)
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  const add = await page
    .getByRole('button', { name: 'Adicionar', exact: true })
    .boundingBox()
  const feedback = await bar.boundingBox()
  if (add === null || feedback === null) throw new Error('Layout unavailable')
  expect(add.y + add.height).toBeLessThanOrEqual(feedback.y)
})
