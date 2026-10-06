// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { attachPhoto, openTestDatabase, shoppingDatabase } from '../helpers/database'
import { addItem, deleteItem, setPurchased, updateItem } from '../../src/features/items/commands'
import { createList, updateList } from '../../src/features/lists/commands'
import { getItemIds } from '../../src/features/items/queries'
import { getListSummary } from '../../src/features/lists/queries'
import { getHistoryPage } from '../../src/features/history/queries'
import { createId } from '../../src/lib/create-id'

describe('shopping item commands', () => {
  it('rejects stale or missing currency context when saving prices', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão', currency: 'JPY' })
    const item = await addItem(db, context, list.id, { name: 'KitKat' })
    const latest = await db.lists.get(list.id)
    await updateList(db, context, list.id, { currency: 'EUR' }, latest?.revision ?? 0)
    await expect(updateItem(db, context, item.id,
      { plannedPriceMinor: 15000, expectedCurrency: 'JPY' }, item.revision))
      .rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(addItem(db, context, list.id, { name: 'Mochila', paidPriceMinor: 0 }))
      .rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await db.items.get(item.id)).toEqual(item)
    expect(await db.items.count()).toBe(1)
  })

  it('rejects invalid creation without creating history or changing list revision', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    await expect(addItem(db, context, list.id, { name: '  ' })).rejects.toThrow()
    expect(await db.items.count()).toBe(0)
    expect(await db.history.count()).toBe(1)
    expect(await db.lists.get(list.id)).toEqual(list)
  })
  it('persists quick entry after reopening the same database', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: '  Nintendo Switch 2  ' })
    db.close()
    const reopened = await openTestDatabase(db.name)
    expect(await reopened.db.items.get(item.id)).toEqual(item)
    expect(item).toMatchObject({
      name: 'Nintendo Switch 2', quantity: 1, status: 'pending',
      plannedPriceMinor: null, paidPriceMinor: null, purchasedAt: null,
    })
    expect(await getItemIds(reopened.db, list.id, 'pending')).toEqual([item.id])
  })

  it('purchases and unpurchases without changing names, notes, prices or photos', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, {
      name: 'Nintendo Switch 2', quantity: 3, plannedPriceMinor: 50000,
      paidPriceMinor: 0, note: 'Oferta', expectedCurrency: 'BRL',
    })
    const photo = await attachPhoto(db, item)
    const purchase = await setPurchased(db, context, item.id, true)
    expect(purchase).toMatchObject({ changed: true, listCompleted: true })
    expect(purchase.operationId).not.toBeNull()
    expect(await getItemIds(db, list.id, 'pending')).toEqual([])
    expect(await getItemIds(db, list.id, 'purchased')).toEqual([item.id])
    const unpurchase = await setPurchased(db, context, item.id, false)
    expect(unpurchase.item).toMatchObject({
      status: 'pending', purchasedAt: null, name: item.name, quantity: 3,
      plannedPriceMinor: 50000, paidPriceMinor: 0, photoId: photo.id, note: 'Oferta',
    })
    expect(await getListSummary(db, list.id)).toMatchObject({ pendingCount: 1, purchasedCount: 0 })
    expect((await getHistoryPage(db)).map((entry) => entry.action)).toEqual(expect.arrayContaining([
      'item_purchased', 'list_completed', 'item_purchase_undone',
    ]))
  })

  it('does not record or celebrate an already satisfied purchase state', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'KitKat' })
    await setPurchased(db, context, item.id, true)
    const before = await db.history.count()
    const repeated = await setPurchased(db, context, item.id, true)
    expect(repeated).toMatchObject({ changed: false, listCompleted: false, operationId: null })
    expect(await db.history.count()).toBe(before)
    expect(repeated.item.revision).toBe(2)
  })

  it('records one purchase and one completion for concurrent duplicate checks', async () => {
    const first = await shoppingDatabase()
    const list = await createList(first.db, first.context, { name: 'Japão' })
    const item = await addItem(first.db, first.context, list.id, { name: 'KitKat' })
    const second = await openTestDatabase(first.db.name)
    const results = await Promise.all([
      setPurchased(first.db, first.context, item.id, true),
      setPurchased(second.db, second.context, item.id, true),
    ])
    expect(results.filter((result) => result.changed)).toHaveLength(1)
    expect(results.filter((result) => result.listCompleted)).toHaveLength(1)
    expect(await first.db.history.filter((entry) => entry.action === 'item_purchased').count()).toBe(1)
  })

  it('records one completion when two sessions buy the remaining items', async () => {
    const first = await shoppingDatabase()
    const list = await createList(first.db, first.context, { name: 'Japão' })
    const itemA = await addItem(first.db, first.context, list.id, { name: 'Mochila' })
    const itemB = await addItem(first.db, first.context, list.id, { name: 'KitKat' })
    const second = await openTestDatabase(first.db.name)
    const results = await Promise.all([
      setPurchased(first.db, first.context, itemA.id, true),
      setPurchased(second.db, second.context, itemB.id, true),
    ])
    expect(results.filter((result) => result.listCompleted)).toHaveLength(1)
    expect(await first.db.history.filter((entry) => entry.action === 'list_completed').count()).toBe(1)
    expect(await getListSummary(first.db, list.id)).toMatchObject({ pendingCount: 0, purchasedCount: 2 })
  })

  it.each(['item_purchased', 'list_completed'])('rolls back when %s cannot be recorded', async (action) => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'KitKat' })
    const listBefore = await db.lists.get(list.id)
    db.history.hook('creating', (_key, entry) => {
      if (entry.action === action) throw new Error('History write failed')
    })
    await expect(setPurchased(db, context, item.id, true)).rejects.toThrow('History write failed')
    expect(await db.items.get(item.id)).toEqual(item)
    expect(await db.lists.get(list.id)).toEqual(listBefore)
    expect(await db.history.count()).toBe(2)
  })

  it('renames without resetting details and leaves old history intact', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, {
      name: 'Mochila', quantity: 2, plannedPriceMinor: 15000, note: 'Leve', expectedCurrency: 'BRL',
    })
    const renamed = await updateItem(db, context, item.id, { name: 'Mochila nova' }, item.revision)
    expect(renamed).toMatchObject({ quantity: 2, plannedPriceMinor: 15000, note: 'Leve', revision: 2 })
    expect(await db.history.count()).toBe(2)
    expect(await getHistoryPage(db)).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'item_added', itemName: 'Mochila' }),
    ]))
    await expect(updateItem(db, context, item.id, { name: 'Obsoleto' }, item.revision))
      .rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await db.items.get(item.id)).toEqual(renamed)
  })

  it('deletes an item and image while returning a recoverable in-memory snapshot', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'Mochila' })
    const photo = await attachPhoto(db, item)
    const deleted = await deleteItem(db, context, item.id)
    expect(deleted.item).toMatchObject({ id: item.id, photoId: photo.id })
    expect(deleted.photo?.blob.size).toBe(photo.blob.size)
    expect(deleted.operationId).toBeTruthy()
    expect(await db.items.get(item.id)).toBeUndefined()
    expect(await db.assets.get(photo.id)).toBeUndefined()
    const reopened = await openTestDatabase(db.name)
    expect(await reopened.db.items.get(item.id)).toBeUndefined()
    expect(await db.history.filter((entry) => entry.action === 'list_completed').count()).toBe(0)
  })

  it('does not call removal of the last pending item a completed shopping list', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const purchased = await addItem(db, context, list.id, { name: 'KitKat' })
    const pending = await addItem(db, context, list.id, { name: 'Mochila' })
    await setPurchased(db, context, purchased.id, true)
    await deleteItem(db, context, pending.id)
    expect(await getListSummary(db, list.id)).toMatchObject({ progress: 100, purchasedCount: 1 })
    expect(await db.history.filter((entry) => entry.action === 'list_completed').count()).toBe(0)
  })

  it('records the completion after the purchase that caused it', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const first = await addItem(db, context, list.id, { name: 'KitKat' })
    const second = await addItem(db, context, list.id, { name: 'Mochila' })
    expect(second.createdAt).toBeGreaterThan(first.createdAt)
    await setPurchased(db, context, first.id, true)
    const result = await setPurchased(db, context, second.id, true)
    expect(result.listCompleted).toBe(true)
    const history = await getHistoryPage(db, 0, list.id)
    expect(history.slice(0, 2).map((entry) => entry.action)).toEqual(['list_completed', 'item_purchased'])
    expect(new Set(history.map((entry) => entry.occurredAt)).size).toBe(history.length)
    const undone = await setPurchased(db, context, second.id, false)
    expect((await getHistoryPage(db, 0, list.id))[0]).toMatchObject({ action: 'item_purchase_undone' })
    expect(undone.item.updatedAt).toBeGreaterThan(result.item.updatedAt)
  })

  it('allows a real new completion after the list has been reopened by addition', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const first = await addItem(db, context, list.id, { name: 'KitKat' })
    await setPurchased(db, context, first.id, true)
    const second = await addItem(db, context, list.id, { name: 'Mochila' })
    expect((await setPurchased(db, context, second.id, true)).listCompleted).toBe(true)
    expect(await db.history.filter((entry) => entry.action === 'list_completed').count()).toBe(2)
  })

  it('rejects stale dataset commands before changing items or history', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'KitKat' })
    await db.meta.update('app', { datasetEpoch: createId() })
    await expect(setPurchased(db, context, item.id, true))
      .rejects.toMatchObject({ code: 'STALE_DATASET' })
    await expect(deleteItem(db, context, item.id)).rejects.toMatchObject({ code: 'STALE_DATASET' })
    await expect(addItem(db, context, list.id, { name: 'Mochila' }))
      .rejects.toMatchObject({ code: 'STALE_DATASET' })
    expect(await db.items.get(item.id)).toEqual(item)
    expect(await db.history.count()).toBe(2)
  })

  it('orders pending by creation and purchased by newest purchase', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const time = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(time)
    const first = await addItem(db, context, list.id, { name: 'KitKat' })
    vi.spyOn(Date, 'now').mockReturnValue(time + 1)
    const second = await addItem(db, context, list.id, { name: 'Mochila' })
    expect(await getItemIds(db, list.id, 'pending')).toEqual([first.id, second.id])
    vi.spyOn(Date, 'now').mockReturnValue(time + 2)
    await setPurchased(db, context, first.id, true)
    vi.spyOn(Date, 'now').mockReturnValue(time + 3)
    await setPurchased(db, context, second.id, true)
    expect(await getItemIds(db, list.id, 'purchased')).toEqual([second.id, first.id])
  })

  it('keeps timestamps valid if the device clock moves backwards', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'KitKat' })
    vi.spyOn(Date, 'now').mockReturnValue(0)
    const result = await setPurchased(db, context, item.id, true)
    expect(result.item.purchasedAt).toBeGreaterThanOrEqual(item.createdAt)
    expect(result.item.updatedAt).toBeGreaterThanOrEqual(item.updatedAt)
  })

  it('rejects missing items without producing orphan data', async () => {
    const { db, context } = await shoppingDatabase()
    await expect(addItem(db, context, createId(), { name: 'Mochila' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(setPurchased(db, context, createId(), true)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await db.items.count()).toBe(0)
    expect(await db.history.count()).toBe(0)
  })

  it('paginates history in sets of fifty and filters by list', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const other = await createList(db, context, { name: 'Mercado' })
    await addItem(db, context, other.id, { name: 'Café' })
    for (let index = 0; index < 52; index++) {
      await addItem(db, context, list.id, { name: 'Presente ' + String(index) })
    }
    const first = await getHistoryPage(db, 0, list.id)
    const second = await getHistoryPage(db, 1, list.id)
    expect(first).toHaveLength(50)
    expect(second).toHaveLength(3)
    expect(new Set([...first, ...second].map((entry) => entry.id)).size).toBe(53)
    expect(first.every((entry) => entry.listId === list.id)).toBe(true)
    await expect(getHistoryPage(db, -1)).rejects.toThrow()
  })
})
