import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady, assertDataset } from '../../db/context'
import type { CommandContext } from '../../db/context'
import { createId } from '../../lib/create-id'
import { z } from 'zod'
import { imageAssetSchema } from '../../db/models'
import { appVersion } from '../../app/version'
import {
  assertBackupAssets,
  assertBackupRelations,
  backupSchema,
} from './format'
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
        exportedAt: new Date().toISOString(),
        appVersion,
        data: { profile: profile[0] ?? null, lists, items, history },
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
  // Nothing is cleared before the whole backup has been validated again here:
  // this command must be safe even when its caller skipped the file validation.
  const metadata = backupSchema.parse(backup.metadata)
  const assets = z.array(imageAssetSchema).parse(backup.assets)
  assertBackupRelations(metadata)
  assertBackupAssets(metadata, assets)
  const { profile, lists, items, history } = metadata.data
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
      if (profile) await db.profile.add(profile)
      await db.lists.bulkAdd(lists)
      await db.items.bulkAdd(items)
      await db.assets.bulkAdd(assets)
      await db.history.bulkAdd(history)
      await db.meta.put({ key: 'app', datasetEpoch: createId() })
    },
  )
}
