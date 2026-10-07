// @vitest-environment node
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { CartoonCheckDatabase } from '../../src/db/database'
import { getCommandContext } from '../../src/db/context'
import { createId } from '../../src/lib/create-id'
import { DATABASE_VERSION, storesV1 } from '../../src/db/schema'

const connections: Dexie[] = []

function database() {
  const db = new CartoonCheckDatabase('test-' + createId())
  connections.push(db)
  return db
}

afterEach(async () => {
  const names = new Set(connections.map((db) => db.name))
  for (const db of connections.splice(0)) db.close()
  await Promise.all(Array.from(names, (name) => Dexie.delete(name)))
})

describe('IndexedDB foundation', () => {
  it('requires permission to create a schema while sharing an existing session', async () => {
    const db = database()
    await expect(db.initialize(false)).rejects.toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
    })
    expect(db.state).toBe('blocked')
    expect(await Dexie.exists(db.name)).toBe(false)
    await db.initialize()
    db.close()
    await db.initialize(false)
    expect(db.state).toBe('ready')
  })
  it('creates the six stores and one stable dataset identity', async () => {
    const db = database()
    expect(db.state).toBe('closed')
    await db.initialize()
    expect(db.state).toBe('ready')
    expect(db.verno).toBe(DATABASE_VERSION)
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      Object.keys(storesV1).sort(),
    )
    const context = await getCommandContext(db)
    expect(context.datasetEpoch).toMatch(/^[\da-f-]{36}$/)
    expect(await db.meta.count()).toBe(1)
    db.close()
    await db.initialize()
    expect(await getCommandContext(db)).toEqual(context)
  })

  it('uses UUID primary keys and only query-relevant indexes', async () => {
    const db = database()
    await db.initialize()
    expect(db.items.schema.primKey.auto).toBe(false)
    expect(db.items.schema.indexes.map((index) => index.name)).toEqual([
      'listId',
      '[listId+status+createdAt]',
      '[listId+status+purchasedAt]',
    ])
    expect(db.assets.schema.indexes).toEqual([])
  })

  it('does not open a database implicitly when a session is closed', async () => {
    const db = database()
    await db.initialize()
    db.close()
    await expect(getCommandContext(db)).rejects.toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
    })
    await expect(db.meta.count()).rejects.toMatchObject({
      name: 'DatabaseClosedError',
    })
    expect(db.isOpen()).toBe(false)
  })

  it('closes an old connection when another version upgrades the database', async () => {
    const db = database()
    await db.initialize()
    const original = await getCommandContext(db)
    const newer = new Dexie(db.name)
    connections.push(newer)
    newer.version(2).stores({ ...storesV1, migrationProbe: 'id' })
    await newer.open()
    expect(db.state).toBe('outdated')
    expect(db.isOpen()).toBe(false)
    expect(await newer.table('meta').get('app')).toEqual({
      key: 'app',
      ...original,
    })
    await expect(db.initialize()).rejects.toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
    })
  })

  it('refuses a newer database without deleting or downgrading it', async () => {
    const db = database()
    const newer = new Dexie(db.name)
    connections.push(newer)
    newer.version(2).stores(storesV1)
    await newer.open()
    const epoch = createId()
    await newer.table('meta').add({ key: 'app', datasetEpoch: epoch })
    newer.close()
    await expect(db.initialize()).rejects.toMatchObject({
      name: 'VersionError',
    })
    expect(db.state).toBe('outdated')
    await newer.open()
    expect(await newer.table('meta').get('app')).toMatchObject({
      datasetEpoch: epoch,
    })
  })

  it('reports missing metadata without silently replacing data', async () => {
    const db = database()
    await db.initialize()
    await db.meta.delete('app')
    await expect(getCommandContext(db)).rejects.toMatchObject({
      code: 'INVALID_DATABASE',
    })
    expect(await db.meta.count()).toBe(0)
  })
})
