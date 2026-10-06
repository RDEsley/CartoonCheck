// @vitest-environment node
import { expect, it } from 'vitest'
import { attachPhoto, shoppingDatabase } from '../../../tests/helpers/database'
import { createList } from '../lists/commands'
import { addItem, deleteItem, setPurchased, updateItem } from './commands'
import { undoItemAction } from './undo'
import { createId } from '../../lib/create-id'

it('undoes a purchase without replaying completion and preserves other fields', async () => {
  const { db, context } = await shoppingDatabase()
  const list = await createList(db, context, { name: 'Japão' })
  const item = await addItem(db, context, list.id, { name: 'Switch', note: 'OLED' })
  const result = await setPurchased(db, context, item.id, true)
  await undoItemAction(db, context, { kind: 'purchase', result })
  expect(await db.items.get(item.id)).toMatchObject({ status: 'pending', purchasedAt: null, note: 'OLED', revision: 3 })
  expect(await db.history.filter((entry) => entry.action === 'list_completed').count()).toBe(1)
  await expect(undoItemAction(db, context, { kind: 'purchase', result })).rejects.toMatchObject({ code: 'CONFLICT' })
})
it('rejects an undo after another edit or a dataset replacement', async () => {
  const { db, context } = await shoppingDatabase()
  const list = await createList(db, context, { name: 'Japan' })
  const item = await addItem(db, context, list.id, { name: 'Switch' })
  const result = await setPurchased(db, context, item.id, true)
  await updateItem(db, context, item.id, { name: 'Switch 2' }, result.item.revision)
  await expect(undoItemAction(db, context, { kind: 'purchase', result })).rejects.toMatchObject({ code: 'CONFLICT' })
  await db.meta.put({ key: 'app', datasetEpoch: createId() })
  await expect(undoItemAction(db, context, { kind: 'purchase', result })).rejects.toMatchObject({ code: 'STALE_DATASET' })
  expect((await db.items.get(item.id))?.name).toBe('Switch 2')
})
it('restores a removed item with its photo and rolls back if history fails', async () => {
  const { db, context } = await shoppingDatabase()
  const list = await createList(db, context, { name: 'Japan' })
  const item = await addItem(db, context, list.id, { name: 'Camera' })
  const photo = await attachPhoto(db, item)
  const snapshot = await deleteItem(db, context, item.id)
  const failHistory = () => { throw new Error('disk error') }
  db.history.hook('creating', failHistory)
  await expect(undoItemAction(db, context, { kind: 'delete', snapshot })).rejects.toThrow('disk error')
  expect(await db.items.count()).toBe(0)
  expect(await db.assets.count()).toBe(0)
  db.history.hook('creating').unsubscribe(failHistory)
  await undoItemAction(db, context, { kind: 'delete', snapshot })
  expect((await db.items.get(item.id))?.photoId).toBe(photo.id)
  expect((await db.assets.get(photo.id))?.blob.size).toBe(photo.blob.size)
})
it('undoes an addition only while its original item is unchanged', async () => {
  const { db, context } = await shoppingDatabase()
  const list = await createList(db, context, { name: 'Japan' })
  const item = await addItem(db, context, list.id, { name: 'KitKat' })
  await undoItemAction(db, context, { kind: 'add', item })
  expect(await db.items.get(item.id)).toBeUndefined()
  expect(await db.history.filter((entry) => entry.action === 'item_removed').count()).toBe(1)
})
