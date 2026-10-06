// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { openTestDatabase, shoppingDatabase } from '../helpers/database'
import { createProfile, updatePreferences, updateProfile } from '../../src/features/profile/commands'
import { createId } from '../../src/lib/create-id'

describe('local profile commands', () => {
  it('stores preference changes made in quick succession without a revision', async () => {
    const { db, context, profile } = await shoppingDatabase()
    const [motion, haptics] = await Promise.all([
      updatePreferences(db, context, { reduceMotion: true }),
      updatePreferences(db, context, { hapticsEnabled: false }),
    ])
    expect(Math.max(motion.revision, haptics.revision)).toBe(profile.revision + 2)
    expect(await db.profile.get(profile.id)).toMatchObject({
      reduceMotion: true, hapticsEnabled: false, name: 'Richard', revision: profile.revision + 2,
    })
    await expect(updatePreferences(db, context, {})).rejects.toThrow()
    await db.meta.put({ key: 'app', datasetEpoch: createId() })
    await expect(updatePreferences(db, context, { themeId: 'sakura' }))
      .rejects.toMatchObject({ code: 'STALE_DATASET' })
  })

  it('persists one profile and its defaults', async () => {
    const { db, profile } = await shoppingDatabase()
    expect(await db.profile.get(profile.id)).toMatchObject({
      name: 'Richard', avatarPresetId: 'bag', themeId: 'comic-pop',
      photoId: null, revision: 1,
    })
    const reopened = await openTestDatabase(db.name)
    expect(await reopened.db.profile.get(profile.id)).toEqual(profile)
  })

  it('rejects a second profile even across concurrent sessions', async () => {
    const first = await openTestDatabase()
    const second = await openTestDatabase(first.db.name)
    const results = await Promise.allSettled([
      createProfile(first.db, first.context, { name: 'Richard' }),
      createProfile(second.db, second.context, { name: 'Outro' }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await first.db.profile.count()).toBe(1)
    await expect(createProfile(first.db, first.context, { name: 'Outro' }))
      .rejects.toMatchObject({ code: 'PROFILE_EXISTS' })
  })

  it('preserves preferences when only the name changes', async () => {
    const { db, context, profile } = await shoppingDatabase()
    const themed = await updateProfile(db, context,
      { themeId: 'sakura', reduceMotion: true, hapticsEnabled: false }, profile.revision)
    const renamed = await updateProfile(db, context, { name: 'Richard Oliveira' }, themed.revision)
    expect(renamed).toMatchObject({
      name: 'Richard Oliveira', themeId: 'sakura', reduceMotion: true,
      hapticsEnabled: false, revision: 3,
    })
    expect(await db.history.count()).toBe(0)
  })

  it('rejects an obsolete editor and preserves the latest profile', async () => {
    const { db, context, profile } = await shoppingDatabase()
    const current = await updateProfile(db, context, { name: 'Richard Oliveira' }, profile.revision)
    await expect(updateProfile(db, context, { name: 'Obsoleto' }, profile.revision))
      .rejects.toMatchObject({ code: 'CONFLICT' })
    expect(await db.profile.get(profile.id)).toEqual(current)
  })

  it('rejects a command from a replaced dataset', async () => {
    const { db, context, profile } = await shoppingDatabase()
    await db.meta.update('app', { datasetEpoch: createId() })
    await expect(updateProfile(db, context, { name: 'Obsoleto' }, profile.revision))
      .rejects.toMatchObject({ code: 'STALE_DATASET' })
    expect(await db.profile.get(profile.id)).toEqual(profile)
  })
})
