import { useState } from 'react'
import { Link } from 'react-router'
import { useRuntime } from '../../app/context'
import { useFeedback } from '../../app/feedback-context'
import { avatarPresets } from '../../db/models'
import type { ImageAsset, Profile } from '../../db/models'
import { BrandArt } from '../../components/BrandArt'
import { BlobImage, StoredImage } from '../../components/StoredImage'
import { CartoonButton } from '../../components/CartoonButton'
import { useTask } from '../../hooks/useTask'
import { compressImage } from '../items/images'
import { errorMessage } from '../../lib/error-message'
import { updateProfile } from './commands'
import styles from '../../app/layout.module.css'
import { useFormDraft } from '../../hooks/useFormDraft'
import { DraftConflict } from '../../pwa/DraftConflict'
import { PageHeading } from '../../components/PageHeading'
import { avatarLabels } from './avatars'
import {
  checkpointPhoto,
  discardDraft,
  initialDraftField,
  initialDraftPhoto,
} from '../../pwa/drafts'
export function ProfileScreen() {
  const { profile } = useRuntime()
  return profile ? <ProfileForm profile={profile} /> : null
}
function ProfileForm({ profile }: { profile: Profile }) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const [snapshot, setSnapshot] = useState(profile)
  const scope = `profile:${profile.id}`
  const initial = (field: string, fallback: string) =>
    initialDraftField(
      scope,
      context.datasetEpoch,
      profile.revision,
      field,
      fallback,
    )
  const [name, setName] = useState(() => initial('name', profile.name))
  const [avatar, setAvatar] = useState<NonNullable<Profile['avatarPresetId']>>(
    () =>
      avatarPresets.find(
        (value) => value === initial('avatar', profile.avatarPresetId ?? 'bag'),
      ) ?? 'bag',
  )
  const [photo, setPhoto] = useState<ImageAsset | null | undefined>(() =>
    initialDraftPhoto(scope, context.datasetEpoch, profile.revision),
  )
  const [processing, setProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const { pending, error, run } = useTask()
  const { conflicted } = useFormDraft(
    scope,
    snapshot.revision,
    '/app/settings/profile',
    {
      name,
      avatar,
      photo:
        photo === undefined ? 'keep' : photo === null ? 'remove' : 'replace',
    },
    {
      name: snapshot.name,
      avatar: snapshot.avatarPresetId ?? 'bag',
      photo: 'keep',
    },
  )
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Só seu</p>
          <PageHeading title="Seu perfil" />
        </div>
      </div>
      {conflicted ? (
        <DraftConflict />
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            void run(
              () =>
                updateProfile(
                  db,
                  context,
                  {
                    name,
                    ...(photo === null ||
                    (photo === undefined && snapshot.photoId === null)
                      ? { avatarPresetId: avatar }
                      : {}),
                  },
                  snapshot.revision,
                  photo ?? undefined,
                ),
              (updated) => {
                discardDraft(scope)
                setSnapshot(updated)
                setPhoto(undefined)
                show('Perfil salvo!')
              },
            )
          }}
        >
          <label>
            Seu nome
            <input
              value={name}
              maxLength={40}
              required
              autoComplete="given-name"
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </label>
          <fieldset className={styles.avatars}>
            <legend>Seu sticker</legend>
            {avatarPresets.map((preset) => (
              <label key={preset} className={styles.avatar}>
                <input
                  type="radio"
                  className="sr-only"
                  name="avatar"
                  aria-label={avatarLabels[preset]}
                  checked={
                    avatar === preset &&
                    (photo === null ||
                      (photo === undefined && snapshot.photoId === null))
                  }
                  onChange={() => {
                    setAvatar(preset)
                    setPhoto(null)
                  }}
                />
                <BrandArt kind={preset} size={64} />
              </label>
            ))}
          </fieldset>
          <div className="row">
            {photo ? (
              <BlobImage blob={photo.blob} />
            ) : photo === undefined && snapshot.photoId ? (
              <StoredImage id={snapshot.photoId} size={80} />
            ) : null}
            <label style={{ flex: 1 }}>
              Ou uma foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  // Clearing the field lets the same photo be chosen again later.
                  event.target.value = ''
                  if (!file || processing || pending) return
                  setProcessing(true)
                  setPhotoError('')
                  void compressImage(file, true)
                    .then(
                      async (asset) => {
                        await checkpointPhoto(scope, asset)
                        setPhoto(asset)
                      },
                      (reason: unknown) => {
                        setPhotoError(errorMessage(reason))
                      },
                    )
                    .finally(() => {
                      setProcessing(false)
                    })
                }}
              />
            </label>
          </div>
          {photoError && (
            <p className="error" role="alert">
              {photoError}
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <CartoonButton
            type="submit"
            disabled={pending || processing || !name.trim()}
          >
            Salvar perfil
          </CartoonButton>
          <Link to="/app/settings" className="text-link">
            Voltar aos ajustes
          </Link>
        </form>
      )}
    </>
  )
}
