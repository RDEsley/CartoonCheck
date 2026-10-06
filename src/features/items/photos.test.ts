// @vitest-environment node
import { expect, it } from 'vitest'
import { attachPhoto, shoppingDatabase } from '../../../tests/helpers/database'
import { createList } from '../lists/commands'
import { addItem, updateItem } from './commands'
import { createId } from '../../lib/create-id'
it('replaces a photo with item details atomically and keeps the old data on collision', async () => {
  const { db, context } = await shoppingDatabase()
  const list = await createList(db, context, { name: 'Japan' })
  const item = await addItem(db, context, list.id, { name: 'Camera' })
  const old = await attachPhoto(db, item)
  await expect(updateItem(db, context, item.id, { name: 'Changed' }, item.revision, old)).rejects.toThrow()
  expect((await db.items.get(item.id))?.name).toBe('Camera')
  expect(await db.assets.count()).toBe(1)
  const photo = { ...old, id: createId() }
  const updated = await updateItem(db, context, item.id, { name: 'New camera' }, item.revision, photo)
  expect(updated.photoId).toBe(photo.id)
  expect(await db.assets.get(old.id)).toBeUndefined()
  expect(await db.assets.count()).toBe(1)
  await updateItem(db, context, item.id, { note: 'Keep everything else' }, updated.revision, null)
  expect(await db.assets.count()).toBe(0)
})
