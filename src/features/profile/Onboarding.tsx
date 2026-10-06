import { useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router'
import { useRuntime } from '../../app/context'
import { BrandArt, Wordmark } from '../../components/BrandArt'
import { CartoonButton } from '../../components/CartoonButton'
import { avatarPresets } from '../../db/models'
import type { Profile } from '../../db/models'
import { createProfile } from './commands'
import { errorMessage } from '../../lib/error-message'
import styles from '../../app/layout.module.css'
import { useFormDraft } from '../../hooks/useFormDraft'
import { discardDraft, initialDraftField } from '../../pwa/drafts'
import { PageHeading } from '../../components/PageHeading'
export function Onboarding() {
  const { db, context, profile } = useRuntime()
  const navigate = useNavigate()
  const [name, setName] = useState(() =>
    initialDraftField('profile:create', context.datasetEpoch, 0, 'name', ''),
  )
  const [avatar, setAvatar] = useState<NonNullable<Profile['avatarPresetId']>>(
    () =>
      avatarPresets.find(
        (value) =>
          value ===
          initialDraftField(
            'profile:create',
            context.datasetEpoch,
            0,
            'avatar',
            'bag',
          ),
      ) ?? 'bag',
  )
  useFormDraft(
    'profile:create',
    0,
    '/onboarding',
    { name, avatar },
    { name: '', avatar: 'bag' },
    true,
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (profile !== null) return <Navigate to="/app" replace />
  return (
    <main className={styles.onboarding}>
      <Wordmark />
      <PageHeading title="Primeiro uso">
        Como podemos
        <br />
        te chamar?
      </PageHeading>
      <p className="muted">Só um nome, e a lista já é sua.</p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (saving) return
          setSaving(true)
          setError('')
          void createProfile(db, context, { name, avatarPresetId: avatar })
            .then(
              () => {
                discardDraft('profile:create')
                void navigate('/app', { replace: true })
              },
              (reason: unknown) => {
                setError(errorMessage(reason))
              },
            )
            .finally(() => {
              setSaving(false)
            })
        }}
      >
        <label>
          Seu nome
          <input
            autoComplete="given-name"
            value={name}
            maxLength={40}
            required
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </label>
        <fieldset className={styles.avatars}>
          <legend>Escolha seu sticker</legend>
          {avatarPresets.map((preset) => (
            <label className={styles.avatar} key={preset}>
              <input
                className="sr-only"
                type="radio"
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
                checked={avatar === preset}
                onChange={() => {
                  setAvatar(preset)
                }}
              />
              <BrandArt kind={preset} size={64} />
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <CartoonButton
          type="submit"
          disabled={saving || name.trim().length === 0}
        >
          {saving ? 'Preparando…' : 'Vamos começar'}
        </CartoonButton>
      </form>
      <p className="muted" style={{ marginTop: 28, fontSize: 14 }}>
        Sem conta. Seus dados ficam neste dispositivo.
      </p>
      <Link to="/restore" className="text-link">
        Já tenho um backup
      </Link>
    </main>
  )
}
