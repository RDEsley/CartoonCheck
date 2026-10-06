import { Link } from 'react-router'
import { useState } from 'react'
import type { Profile } from '../../db/models'
import { useRuntime } from '../../app/context'
import { useFeedback } from '../../app/feedback-context'
import { BrandArt } from '../../components/BrandArt'
import { CartoonButton } from '../../components/CartoonButton'
import { updateProfile } from '../profile/commands'
import { useTask } from '../../hooks/useTask'
import { themes } from '../../db/models'
import styles from '../../app/layout.module.css'
import settingsStyles from './settings.module.css'
const themeLabels = {
  'comic-pop': 'Comic Pop',
  sakura: 'Sakura',
  'night-cartoon': 'Night Cartoon',
}
export function SettingsScreen() {
  const { profile, db, context } = useRuntime()
  const { show } = useFeedback()
  const { pending, error, run } = useTask()
  const [local, setLocal] = useState<Profile | null>(null)
  if (profile === null) return null
  const selected = local?.revision === profile.revision ? local : profile
  function change(fields: Partial<Pick<Profile, 'reduceMotion' | 'hapticsEnabled'>>) {
    if (profile === null) return
    setLocal({ ...profile, ...fields })
    void run(() => updateProfile(db, context, fields, profile.revision)).then(
      (success) => {
        if (!success) setLocal(null)
      },
    )
  }
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Do seu jeito</p>
          <h1 id="page-title" tabIndex={-1}>
            Ajustes
          </h1>
          <p className="muted">Um pouco mais de você em cada check.</p>
        </div>
      </div>
      <div className="stack">
        <Link
          to="/app/settings/profile"
          className={styles.card}
          style={{ textDecoration: 'none' }}
        >
          <strong>Seu perfil</strong>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            {profile.name} · Editar nome e avatar →
          </p>
        </Link>
        <fieldset className={settingsStyles.themes}>
          <legend>Escolha seu tema</legend>
          {themes.map((theme) => (
            <label
              key={theme}
              data-theme={theme}
              className={settingsStyles.theme}
            >
              <input
                className="sr-only"
                type="radio"
                name="theme"
                aria-label={themeLabels[theme]}
                checked={selected.themeId === theme}
                disabled={pending}
                onChange={() => {
                  void run(
                    () =>
                      updateProfile(
                        db,
                        context,
                        { themeId: theme },
                        profile.revision,
                      ),
                    () => {
                      show(`Tema ${themeLabels[theme]} aplicado!`)
                    },
                  )
                }}
              />
              <BrandArt
                kind={
                  theme === 'sakura'
                    ? 'leaf'
                    : theme === 'night-cartoon'
                      ? 'planet'
                      : 'star'
                }
                size={72}
              />
              <strong>{themeLabels[theme]}</strong>
              <span className={settingsStyles.swatches}>
                <i />
                <i />
                <i />
              </span>
            </label>
          ))}
        </fieldset>
        <div className={styles.card}>
          <h2 style={{ fontSize: 20 }}>Sensação do check</h2>
          <label className={settingsStyles.toggle}>
            <input
              type="checkbox"
              checked={selected.reduceMotion}
              disabled={pending}
              onChange={(event) => {
                change({ reduceMotion: event.target.checked })
              }}
            />
            Reduzir animações
          </label>
          <p className="muted" style={{ fontSize: 14 }}>
            A preferência do seu sistema também é respeitada.
          </p>
          <label className={settingsStyles.toggle}>
            <input
              type="checkbox"
              checked={selected.hapticsEnabled}
              disabled={pending}
              onChange={(event) => {
                change({ hapticsEnabled: event.target.checked })
              }}
            />
            Vibração sutil
          </label>
          <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
            Quando o dispositivo permitir.
          </p>
        </div>
        <Link
          to="/app/settings/backup"
          className={styles.card}
          style={{ textDecoration: 'none' }}
        >
          <strong>Backup dos seus dados</strong>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Exportar e restaurar →
          </p>
        </Link>
        <div className={styles.card}>
          <h2 style={{ fontSize: 20 }}>Privado por natureza</h2>
          <p className="muted">
            Listas e fotos ficam neste dispositivo. Não temos conta, servidor de
            dados ou rastreamento. Limpar os dados do navegador remove suas
            listas; guarde um backup em um lugar seguro.
          </p>
          <CartoonButton
            variant="quiet"
            onClick={() => {
              if (
                !('storage' in navigator) ||
                !('persist' in navigator.storage)
              ) {
                show(
                  'Este navegador não oferece proteção de armazenamento. Mantenha um backup.',
                )
                return
              }
              void navigator.storage.persist().then(
                (persistent) => {
                  show(
                    persistent
                      ? 'Armazenamento persistente autorizado.'
                      : 'Este navegador pode liberar espaço. Mantenha um backup dos seus dados.',
                  )
                },
                () => {
                  show(
                    'Este navegador não autorizou armazenamento persistente. Mantenha um backup.',
                  )
                },
              )
            }}
          >
            Proteger armazenamento local
          </CartoonButton>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </>
  )
}
