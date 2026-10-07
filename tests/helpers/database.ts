import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach } from 'vitest'
import { CartoonCheckDatabase } from '../../src/db/database'
import { getCommandContext } from '../../src/db/context'
import { createId } from '../../src/lib/create-id'
import { createProfile } from '../../src/features/profile/commands'
import { imageAssetSchema } from '../../src/db/models'
import type { ShoppingItem } from '../../src/db/models'

const connections: CartoonCheckDatabase[] = []

export async function openTestDatabase(name = 'test-' + createId()) {
  const db = new CartoonCheckDatabase(name)
  connections.push(db)
  await db.initialize()
  return { db, context: await getCommandContext(db) }
}

export async function shoppingDatabase() {
  const scenario = await openTestDatabase()
  const profile = await createProfile(scenario.db, scenario.context, {
    name: 'Richard',
  })
  return { ...scenario, profile }
}

export async function attachPhoto(
  db: CartoonCheckDatabase,
  item: ShoppingItem,
) {
  const blob = new Blob(['stored photo'], { type: 'image/webp' })
  const photo = imageAssetSchema.parse({
    id: createId(),
    blob,
    mime: blob.type,
    width: 100,
    height: 100,
    byteLength: blob.size,
    createdAt: item.createdAt,
  })
  await db.transaction('rw', [db.assets, db.items], async () => {
    await db.assets.add(photo)
    await db.items.update(item.id, { photoId: photo.id })
  })
  return photo
}

afterEach(async () => {
  const names = new Set(connections.map((db) => db.name))
  for (const connection of connections.splice(0)) connection.close()
  await Promise.all(Array.from(names, (name) => Dexie.delete(name)))
})
