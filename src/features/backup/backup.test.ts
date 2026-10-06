// @vitest-environment node
import { expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { shoppingDatabase } from '../../../tests/helpers/database'
import { createList } from '../lists/commands'
import { addItem } from '../items/commands'
import { getCommandContext } from '../../db/context'
import { packBackup, readStoredZip, validateBackup } from './format'
import { replaceBackup, snapshotBackup } from './commands'

async function scenario() {
  const state = await shoppingDatabase()
  const list = await createList(state.db, state.context, {
    name: 'Japão',
    currency: 'JPY',
  })
  const item = await addItem(state.db, state.context, list.id, {
    name: 'Switch 2',
    expectedCurrency: 'JPY',
    plannedPriceMinor: 45000,
  })
  return { ...state, list, item }
}
it('round-trips a versioned archive and invalidates old command contexts', async () => {
  const { db, context, list, item } = await scenario()
  const original = await snapshotBackup(db)
  const blob = await packBackup(original)
  const restored = await validateBackup(await blob.arrayBuffer())
  expect(restored.metadata).toEqual(original.metadata)
  await addItem(db, context, list.id, { name: 'Temporary' })
  await replaceBackup(db, context, restored)
  expect(await db.items.toArray()).toEqual([item])
  expect((await getCommandContext(db)).datasetEpoch).not.toBe(
    context.datasetEpoch,
  )
  await expect(
    addItem(db, context, list.id, { name: 'Stale item' }),
  ).rejects.toMatchObject({ code: 'STALE_DATASET' })
})
it('preserves the entire database if replacement fails after clearing tables', async () => {
  const { db, context } = await scenario()
  const original = await snapshotBackup(db)
  const failing = () => {
    throw new Error('quota exceeded')
  }
  db.items.hook('creating', failing)
  await expect(replaceBackup(db, context, original)).rejects.toThrow(
    'quota exceeded',
  )
  db.items.hook('creating').unsubscribe(failing)
  const current = await snapshotBackup(db)
  expect(current.metadata.items).toEqual(original.metadata.items)
  expect(current.metadata.profile).toEqual(original.metadata.profile)
  expect(current.metadata.lists).toEqual(original.metadata.lists)
  expect(current.metadata.history).toEqual(original.metadata.history)
  expect(await getCommandContext(db)).toEqual(context)
})
it('rejects CRC corruption, compressed entries, traversal and duplicate records', async () => {
  const { db } = await scenario()
  const data = await snapshotBackup(db)
  const blob = await packBackup(data)
  const corrupt = new Uint8Array(await blob.arrayBuffer())
  corrupt[45] = (corrupt[45] ?? 0) ^ 1
  expect(() => readStoredZip(corrupt.buffer)).toThrow()
  const compressed = zipSync({
    'backup.json': strToU8(JSON.stringify(data.metadata)),
  })
  expect(() => readStoredZip(new Uint8Array(compressed).buffer)).toThrow()
  const traversal = zipSync({ '../backup.json': strToU8('{}') }, { level: 0 })
  expect(() => readStoredZip(new Uint8Array(traversal).buffer)).toThrow()
  const duplicate = {
    ...data,
    metadata: {
      ...data.metadata,
      items: [...data.metadata.items, ...data.metadata.items],
    },
  }
  await expect(
    validateBackup(await (await packBackup(duplicate)).arrayBuffer()),
  ).rejects.toThrow('Duplicate')
})
it('rejects orphan items, unknown versions and missing image files before writing', async () => {
  const { db } = await scenario()
  const data = await snapshotBackup(db)
  const orphan = { ...data, metadata: { ...data.metadata, lists: [] } }
  await expect(
    validateBackup(await (await packBackup(orphan)).arrayBuffer()),
  ).rejects.toThrow('parent')
  const versioned = zipSync(
    {
      'backup.json': strToU8(
        JSON.stringify({ ...data.metadata, formatVersion: 2 }),
      ),
    },
    { level: 0 },
  )
  await expect(
    validateBackup(new Uint8Array(versioned).buffer),
  ).rejects.toThrow()
  const missing = {
    ...data,
    metadata: {
      ...data.metadata,
      items: data.metadata.items.map((item) => ({ ...item, photoId: item.id })),
    },
  }
  await expect(
    validateBackup(await (await packBackup(missing)).arrayBuffer()),
  ).rejects.toThrow('Image references')
})
