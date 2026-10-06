import type { CartoonCheckDatabase } from '../../db/database'
import { assertDatabaseReady, assertDataset, assertRevision, updatedTime } from '../../db/context'
import type { CommandContext } from '../../db/context'
import { DataError } from '../../db/errors'
import { createProfileSchema, profileSchema, updateProfileSchema } from '../../db/models'
import type { CreateProfileInput, Profile, UpdateProfileInput } from '../../db/models'
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

export async function updateProfile(
  db: CartoonCheckDatabase,
  context: CommandContext,
  input: UpdateProfileInput,
  expectedRevision: number,
): Promise<Profile> {
  const fields = updateProfileSchema.parse(input)
  assertDatabaseReady(db)
  return db.transaction('rw', [db.meta, db.profile, db.assets], async () => {
    await assertDataset(db, context)
    const current = await requireProfile(db)
    assertRevision(current.revision, expectedRevision)
    const profile = profileSchema.parse({
      ...current, ...fields,
      photoId: fields.avatarPresetId === undefined ? current.photoId : null,
      updatedAt: updatedTime(current.updatedAt),
      revision: current.revision + 1,
    })
    if (current.photoId !== null && profile.photoId === null) {
      await db.assets.delete(current.photoId)
    }
    await db.profile.put(profile)
    return profile
  })
}
