import { expect, test } from '@playwright/test'
import { connectDatabase } from './database-session'

test('persists Richard, Japão and Nintendo Switch 2 after closing and reopening a page', async ({ page, context }) => {
  const name = 'browser-' + crypto.randomUUID()
  await connectDatabase(page, name)
  const saved = await page.evaluate(async () => {
    const { db, context: commands, profile, lists, items } = window.cartoonCheckTestSession
    const person = await profile.createProfile(db, commands, { name: 'Richard' })
    const list = await lists.createList(db, commands, { name: 'Japão', currency: 'JPY' })
    const item = await items.addItem(db, commands, list.id, { name: 'Nintendo Switch 2' })
    return { person, list, item, epoch: commands.datasetEpoch }
  })
  await page.close()

  const reopened = await context.newPage()
  await connectDatabase(reopened, name)
  const persisted = await reopened.evaluate(async (ids) => {
    const { db, context: commands } = window.cartoonCheckTestSession
    return {
      person: await db.profile.get(ids.profileId),
      item: await db.items.get(ids.itemId),
      epoch: commands.datasetEpoch,
    }
  }, { profileId: saved.person.id, itemId: saved.item.id })
  expect(persisted).toEqual({ person: saved.person, item: saved.item, epoch: saved.epoch })

  const purchase = await reopened.evaluate(async (id) => {
    const { db, context: commands, items, itemQueries } = window.cartoonCheckTestSession
    const result = await items.setPurchased(db, commands, id, true)
    return {
      changed: result.changed,
      completed: result.listCompleted,
      pending: await itemQueries.getItemIds(db, result.item.listId, 'pending'),
      purchased: await itemQueries.getItemIds(db, result.item.listId, 'purchased'),
      actions: (await db.history.toArray()).map((entry) => entry.action),
    }
  }, saved.item.id)
  expect(purchase).toMatchObject({ changed: true, completed: true, pending: [], purchased: [saved.item.id] })
  expect(purchase.actions).toEqual(expect.arrayContaining(['item_purchased', 'list_completed']))

  const restored = await reopened.evaluate(async (id) => {
    const { db, context: commands, items, listQueries } = window.cartoonCheckTestSession
    const result = await items.setPurchased(db, commands, id, false)
    return { item: result.item, summary: await listQueries.getListSummary(db, result.item.listId) }
  }, saved.item.id)
  expect(restored.item).toMatchObject({ status: 'pending', purchasedAt: null, name: saved.item.name })
  expect(restored.summary).toMatchObject({ pendingCount: 1, purchasedCount: 0 })
})

test('serializes purchases from two tabs and records a single completion', async ({ page, context }) => {
  const name = 'browser-' + crypto.randomUUID()
  await connectDatabase(page, name)
  const ids = await page.evaluate(async () => {
    const { db, context: commands, profile, lists, items } = window.cartoonCheckTestSession
    await profile.createProfile(db, commands, { name: 'Richard' })
    const list = await lists.createList(db, commands, { name: 'Japão' })
    const first = await items.addItem(db, commands, list.id, { name: 'Mochila' })
    const second = await items.addItem(db, commands, list.id, { name: 'KitKat' })
    return { listId: list.id, firstId: first.id, secondId: second.id }
  })
  const secondTab = await context.newPage()
  await connectDatabase(secondTab, name)
  const results = await Promise.all([
    page.evaluate(async (id) => {
      const { db, context: commands, items } = window.cartoonCheckTestSession
      return (await items.setPurchased(db, commands, id, true)).listCompleted
    }, ids.firstId),
    secondTab.evaluate(async (id) => {
      const { db, context: commands, items } = window.cartoonCheckTestSession
      return (await items.setPurchased(db, commands, id, true)).listCompleted
    }, ids.secondId),
  ])
  expect(results.filter(Boolean)).toHaveLength(1)
  const state = await page.evaluate(async (listId) => {
    const { db, listQueries } = window.cartoonCheckTestSession
    return {
      summary: await listQueries.getListSummary(db, listId),
      completions: await db.history.filter((entry) => entry.action === 'list_completed').count(),
    }
  }, ids.listId)
  expect(state).toMatchObject({ summary: { pendingCount: 0, purchasedCount: 2 }, completions: 1 })
})

test('rolls back the purchase and its history when completion recording fails', async ({ page }) => {
  await connectDatabase(page, 'browser-' + crypto.randomUUID())
  const result = await page.evaluate(async () => {
    const { db, context: commands, profile, lists, items } = window.cartoonCheckTestSession
    await profile.createProfile(db, commands, { name: 'Richard' })
    const list = await lists.createList(db, commands, { name: 'Japão' })
    const item = await items.addItem(db, commands, list.id, { name: 'KitKat' })
    const before = { item, list: await db.lists.get(list.id), history: await db.history.count() }
    db.history.hook('creating', (_key, entry) => {
      if (entry.action === 'list_completed') throw new Error('Simulated history failure')
    })
    let failure = ''
    try {
      await items.setPurchased(db, commands, item.id, true)
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    }
    return {
      failure, before,
      after: { item: await db.items.get(item.id), list: await db.lists.get(list.id),
        history: await db.history.count() },
    }
  })
  expect(result.failure).toContain('Simulated history failure')
  expect(result.after).toEqual(result.before)
})

test('rejects a stale dataset context without changing saved data', async ({ page }) => {
  await connectDatabase(page, 'browser-' + crypto.randomUUID())
  const result = await page.evaluate(async () => {
    const { db, context: commands, profile, lists, items } = window.cartoonCheckTestSession
    await profile.createProfile(db, commands, { name: 'Richard' })
    const list = await lists.createList(db, commands, { name: 'Japão' })
    const item = await items.addItem(db, commands, list.id, { name: 'KitKat' })
    await db.meta.update('app', { datasetEpoch: crypto.randomUUID() })
    let code: unknown
    try {
      await items.setPurchased(db, commands, item.id, true)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) code = error.code
    }
    return { code, original: item, current: await db.items.get(item.id), history: await db.history.count() }
  })
  expect(result.code).toBe('STALE_DATASET')
  expect(result.current).toEqual(result.original)
  expect(result.history).toBe(2)
})
