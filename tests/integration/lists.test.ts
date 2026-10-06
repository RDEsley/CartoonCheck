// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { attachPhoto, openTestDatabase, shoppingDatabase } from '../helpers/database'
import {
  archiveList, createList, deleteList, reactivateList, updateList,
} from '../../src/features/lists/commands'
import { addItem, deleteItem, setPurchased, updateItem } from '../../src/features/items/commands'
import { getListIds, getListSummary } from '../../src/features/lists/queries'
import { getHistoryPage } from '../../src/features/history/queries'

describe('shopping list commands', () => {
  it('rejects deletion confirmed against an obsolete list revision', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'Mochila' })
    await expect(deleteList(db, context, list.id, list.revision))
      .rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await db.lists.get(list.id)).toBeDefined()
    expect(await db.items.get(item.id)).toEqual(item)
  })
  it('requires a local profile before creating a list', async () => {
    const { db, context } = await openTestDatabase()
    await expect(createList(db, context, { name: 'Japão' }))
      .rejects.toMatchObject({ code: 'PROFILE_REQUIRED' })
    expect(await db.lists.count()).toBe(0)
    expect(await db.history.count()).toBe(0)
  })

  it('creates a normalized list with currency and historical snapshot', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: '  Japão  ', emoji: '🇯🇵', currency: 'JPY' })
    expect(list).toMatchObject({ name: 'Japão', status: 'active', currency: 'JPY', revision: 1 })
    expect(await db.lists.get(list.id)).toEqual(list)
    expect(await getListSummary(db, list.id)).toMatchObject({
      pendingCount: 0, purchasedCount: 0, progress: null,
    })
    expect(await getHistoryPage(db)).toMatchObject([{
      action: 'list_created', listId: list.id, listName: 'Japão', itemId: null,
    }])
  })

  it('preserves currency settings on rename and refuses stale edits', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, {
      name: 'Japão', currency: 'JPY', secondaryCurrency: 'BRL', manualExchangeRate: '0.035',
    })
    const renamed = await updateList(db, context, list.id, { name: 'Viagem' }, list.revision)
    expect(renamed).toMatchObject({
      currency: 'JPY', secondaryCurrency: 'BRL', manualExchangeRate: '0.035', revision: 2,
    })
    await expect(updateList(db, context, list.id, { name: 'Obsoleto' }, list.revision))
      .rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await db.lists.get(list.id)).toEqual(renamed)
    expect(await getHistoryPage(db)).toMatchObject([{ listName: 'Japão' }])
  })

  it('archives idempotently and prevents mutations until reactivated', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'Mochila' })
    const archived = await archiveList(db, context, list.id)
    expect(await archiveList(db, context, list.id)).toEqual(archived)
    await expect(addItem(db, context, list.id, { name: 'KitKat' }))
      .rejects.toMatchObject({ code: 'ARCHIVED_LIST' })
    await expect(updateList(db, context, list.id, { name: 'Outra' }, archived.revision))
      .rejects.toMatchObject({ code: 'ARCHIVED_LIST' })
    await expect(updateItem(db, context, item.id, { name: 'Outra' }, item.revision))
      .rejects.toMatchObject({ code: 'ARCHIVED_LIST' })
    await expect(setPurchased(db, context, item.id, true))
      .rejects.toMatchObject({ code: 'ARCHIVED_LIST' })
    await expect(deleteItem(db, context, item.id))
      .rejects.toMatchObject({ code: 'ARCHIVED_LIST' })
    expect(await getListIds(db)).toEqual([])
    expect(await getListIds(db, 'archived')).toEqual([list.id])
    await reactivateList(db, context, list.id)
    expect(await getListIds(db)).toEqual([list.id])
    expect(await db.history.filter((entry) => entry.action === 'list_archived').count()).toBe(1)
  })

  it('does not reinterpret prices when changing currency, including zero', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão', currency: 'JPY' })
    await addItem(db, context, list.id, { name: 'Presente', plannedPriceMinor: 0, expectedCurrency: 'JPY' })
    const current = await db.lists.get(list.id)
    await expect(updateList(db, context, list.id, { currency: 'BRL' }, current?.revision ?? 0))
      .rejects.toMatchObject({ code: 'CURRENCY_LOCKED' })
    expect((await db.lists.get(list.id))?.currency).toBe('JPY')
  })

  it('clears the exchange settings when an unpriced list changes currency', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, {
      name: 'Japão', currency: 'JPY', secondaryCurrency: 'BRL', manualExchangeRate: '0.035',
    })
    const updated = await updateList(db, context, list.id, { currency: 'EUR' }, list.revision)
    expect(updated).toMatchObject({ currency: 'EUR', secondaryCurrency: null, manualExchangeRate: null })
  })

  it('deletes a list, its items and their photos while retaining history and other lists', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const other = await createList(db, context, { name: 'Mercado' })
    const item = await addItem(db, context, list.id, { name: 'Mochila' })
    const otherItem = await addItem(db, context, other.id, { name: 'Café' })
    const photo = await attachPhoto(db, item)
    const otherPhoto = await attachPhoto(db, otherItem)
    const latest = await db.lists.get(list.id)
    await deleteList(db, context, list.id, latest?.revision ?? 0)
    expect(await db.lists.get(list.id)).toBeUndefined()
    expect(await db.items.get(item.id)).toBeUndefined()
    expect(await db.assets.get(photo.id)).toBeUndefined()
    expect(await db.items.get(otherItem.id)).toBeDefined()
    expect(await db.assets.get(otherPhoto.id)).toBeDefined()
    expect(await getListSummary(db, list.id)).toBeNull()
    expect(await getHistoryPage(db, 0, list.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'list_deleted', listName: 'Japão' }),
      expect.objectContaining({ action: 'item_added', itemName: 'Mochila' }),
    ]))
  })

  it('rolls back cascading deletion if its history cannot be saved', async () => {
    const { db, context } = await shoppingDatabase()
    const list = await createList(db, context, { name: 'Japão' })
    const item = await addItem(db, context, list.id, { name: 'Mochila' })
    const photo = await attachPhoto(db, item)
    db.history.hook('creating', () => { throw new Error('History write failed') })
    const latest = await db.lists.get(list.id)
    await expect(deleteList(db, context, list.id, latest?.revision ?? 0)).rejects.toThrow('History write failed')
    expect(await db.lists.get(list.id)).toBeDefined()
    expect(await db.items.get(item.id)).toBeDefined()
    expect(await db.assets.get(photo.id)).toBeDefined()
    expect(await db.history.count()).toBe(2)
  })

  it('orders the home by last change and returns deterministic ids', async () => {
    const { db, context } = await shoppingDatabase()
    const time = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(time)
    const first = await createList(db, context, { name: 'Japão' })
    vi.spyOn(Date, 'now').mockReturnValue(time + 1)
    const second = await createList(db, context, { name: 'Mercado' })
    expect(await getListIds(db)).toEqual([second.id, first.id])
    vi.spyOn(Date, 'now').mockReturnValue(time + 2)
    await addItem(db, context, first.id, { name: 'Mochila' })
    expect(await getListIds(db)).toEqual([first.id, second.id])
  })
})
