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
import { updateProfile } from './commands'
import styles from '../../app/layout.module.css'
export function ProfileScreen() {
  const { profile } = useRuntime()
  return profile ? <ProfileForm profile={profile} /> : null
}
function ProfileForm({ profile }: { profile: Profile }) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const [snapshot, setSnapshot] = useState(profile)
  const [name, setName] = useState(profile.name)
  const [avatar, setAvatar] = useState<NonNullable<Profile['avatarPresetId']>>(
    profile.avatarPresetId ?? 'bag',
  )
  const [photo, setPhoto] = useState<ImageAsset | null | undefined>(undefined)
  const [processing, setProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const { pending, error, run } = useTask()
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Só seu</p>
          <h1 id="page-title" tabIndex={-1}>
            Seu perfil
          </h1>
        </div>
      </div>
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
                aria-label={
                  {
                    bag: 'Sacola',
                    star: 'Estrela',
                    gift: 'Presente',
                    leaf: 'Folha',
                    planet: 'Planeta',
                  }[preset]
                }
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
              disabled={pending || processing}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setProcessing(true)
                setPhotoError('')
                void compressImage(file, true)
                  .then(setPhoto, () => {
                    setPhotoError('Escolha JPEG, PNG ou WebP de até 15 MB.')
                  })
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
        <Link to="/app/settings" style={{ minHeight: 48 }}>
          Voltar aos ajustes
        </Link>
      </form>
    </>
  )
}
