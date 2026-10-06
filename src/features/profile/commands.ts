import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady, assertDataset, assertRevision, updatedTime } from '../../db/context'
import type { CommandContext } from '../../db/context'
import { DataError } from '../../db/errors'
import {
  createProfileSchema, imageAssetSchema, preferencesSchema, profileSchema, updateProfileSchema,
} from '../../db/models'
import type {
  CreateProfileInput, ImageAsset, PreferencesInput, Profile, UpdateProfileInput,
} from '../../db/models'
import { requireProfile } from '../../db/records'
import { createId } from '../../lib/create-id'

export async function createProfile(
  db: CartoonCheckDatabase,
  context: CommandContext,
  input: CreateProfileInput,
): Promise<Profile> {
  const fields = createProfileSchema.parse(input)
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.profile], async () => {
    await assertDataset(db, context)
    if (await db.profile.count() > 0) {
      throw new DataError('PROFILE_EXISTS', 'A local profile already exists.')
    }
    const time = Date.now()
    const profile = profileSchema.parse({
      ...fields, id: createId(), photoId: null,
      createdAt: time, updatedAt: time, revision: 1,
    })
    await db.profile.add(profile)
    return profile
  })
}

/**
 * Changes the theme or a feedback preference. These switches are independent of
 * each other and of the profile form, so the latest choice wins instead of
 * being rejected for an outdated revision.
 */
export async function updatePreferences(
  db: CartoonCheckDatabase,
  context: CommandContext,
  input: PreferencesInput,
): Promise<Profile> {
  const fields = preferencesSchema.parse(input)
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.profile], async () => {
    await assertDataset(db, context)
    const current = await requireProfile(db)
    const profile = profileSchema.parse({
      ...current, ...fields,
      updatedAt: updatedTime(current.updatedAt), revision: current.revision + 1,
    })
    await db.profile.put(profile)
    return profile
  })
}

export async function updateProfile(
  db: CartoonCheckDatabase,
  context: CommandContext,
  input: UpdateProfileInput,
  expectedRevision: number,
  photo?: ImageAsset,
): Promise<Profile> {
  const fields = updateProfileSchema.parse(input)
  const asset = photo === undefined ? undefined : imageAssetSchema.parse(photo)
  if (asset !== undefined && (asset.width > 256 || asset.height > 256 || asset.byteLength > 128 * 1024)) throw new DataError('CONFLICT', 'Resize the avatar before saving.')
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.profile, db.assets], async () => {
    await assertDataset(db, context)
    const current = await requireProfile(db)
    assertRevision(current.revision, expectedRevision)
    const profile = profileSchema.parse({
      ...current, ...fields,
      ...(asset === undefined ? { photoId: fields.avatarPresetId === undefined ? current.photoId : null } : { photoId: asset.id, avatarPresetId: null }),
      updatedAt: updatedTime(current.updatedAt),
      revision: current.revision + 1,
    })
    if (asset !== undefined) await db.assets.add(asset)
    if (current.photoId !== null && profile.photoId !== current.photoId) {
      await db.assets.delete(current.photoId)
    }
    await db.profile.put(profile)
    return profile
  })
}
