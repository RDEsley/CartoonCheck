import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady, assertDataset } from '../../db/context'
import type { CommandContext } from '../../db/context'
import { createId } from '../../lib/create-id'
import { backupSchema } from './format'
import type { BackupData } from './format'
export async function snapshotBackup(
  db: CartoonCheckDatabase,
): Promise<BackupData> {
  assertDatabaseReady(db)
  return db.transaction(
    'r',
    [db.profile, db.lists, db.items, db.assets, db.history],
    async () => {
      const [profile, lists, items, assets, history] = await Promise.all([
        db.profile.toArray(),
        db.lists.toArray(),
        db.items.toArray(),
        db.assets.toArray(),
        db.history.toArray(),
      ])
      if (profile.length > 1) throw new Error('Invalid local profile.')
      const metadata = backupSchema.parse({
        format: 'cartoon-check',
        formatVersion: 1,
        databaseVersion: 1,
        exportedAt: Date.now(),
        profile: profile[0] ?? null,
        lists,
        items,
        history,
        assets: assets.map((asset) => ({
          id: asset.id,
          mime: asset.mime,
          width: asset.width,
          height: asset.height,
          byteLength: asset.byteLength,
          createdAt: asset.createdAt,
        })),
      })
      return { metadata, assets }
    },
  )
}
export async function replaceBackup(
  db: CartoonCheckDatabase,
  context: CommandContext,
  backup: BackupData,
) {
  const metadata = backupSchema.parse(backup.metadata)
  assertDatabaseReady(db)
  return db.transaction(
    'rw',
    [db.meta, db.profile, db.lists, db.items, db.assets, db.history],
    async () => {
      await assertDataset(db, context)
      await Promise.all([
        db.profile.clear(),
        db.lists.clear(),
        db.items.clear(),
        db.assets.clear(),
        db.history.clear(),
      ])
      if (metadata.profile) await db.profile.add(metadata.profile)
      await db.lists.bulkAdd(metadata.lists)
      await db.items.bulkAdd(metadata.items)
      await db.assets.bulkAdd(backup.assets)
      await db.history.bulkAdd(metadata.history)
      await db.meta.put({ key: 'app', datasetEpoch: createId() })
    },
  )
}
