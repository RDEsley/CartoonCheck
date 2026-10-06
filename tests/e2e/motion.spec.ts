import { expect, test } from '@playwright/test'
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`pressing a button keeps its hit target still with reduced motion ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/app')
    await page.getByLabel('Seu nome').fill('Richard')
    const button = page.getByRole('button', { name: 'Vamos começar' })
    const before = await button.boundingBox()
    if (before === null) throw new Error('Button layout unavailable')
    await page.mouse.move(
      before.x + before.width / 2,
      before.y + before.height / 2,
    )
    await page.mouse.down()
    await page.waitForTimeout(200)
    const pressed = await button.evaluate((element) => {
      const face = element.firstElementChild
      if (face === null) throw new Error('Button face missing')
      return {
        top: element.getBoundingClientRect().top,
        face: getComputedStyle(face).transform,
      }
    })
    await page.mouse.up()
    expect(pressed.top).toBe(before.y)
    if (reducedMotion === 'reduce') expect(pressed.face).toBe('none')
    else expect(pressed.face).not.toBe('none')
    await expect(
      page.getByRole('heading', { name: 'Olá, Richard 👋' }),
    ).toBeVisible()
  })
}
