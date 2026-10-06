import { Link } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import type { PreferencesInput, Profile } from '../../db/models'
import { useRuntime } from '../../app/context'
import { useFeedback } from '../../app/feedback-context'
import { BrandArt } from '../../components/BrandArt'
import { CartoonButton } from '../../components/CartoonButton'
import { updatePreferences } from '../profile/commands'
import { errorMessage } from '../../lib/error-message'
import { beginOperation, operationsPaused } from '../../pwa/operations'
import { themes } from '../../db/models'
import styles from '../../app/layout.module.css'
import settingsStyles from './settings.module.css'
import { InstallButton } from '../install/InstallButton'
import { PageHeading } from '../../components/PageHeading'
import {
  formatBytes,
  readStorageState,
  requestPersistence,
} from '../../pwa/storage'
import type { StorageState } from '../../pwa/storage'
const themeLabels = {
  'comic-pop': 'Comic Pop',
  sakura: 'Sakura',
  'night-cartoon': 'Night Cartoon',
}
export function SettingsScreen() {
  const { profile, db, context } = useRuntime()
  const { show } = useFeedback()
  // Controls stay enabled while saving, so keyboard focus is not dropped, and
  // changes are stored one after another, so a quick second one is never lost.
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<PreferencesInput>({})
  const [saved, setSaved] = useState<Profile | null>(null)
  const queue = useRef(Promise.resolve())
  const waiting = useRef(0)
  const [storage, setStorage] = useState<StorageState | null>(null)
  useEffect(() => {
    let active = true
    void readStorageState().then((state) => {
      if (active) setStorage(state)
    })
    return () => {
      active = false
    }
  }, [])
  if (profile === null) return null
  // What was just saved is shown until the live profile catches up with it.
  const stored =
    saved !== null && saved.revision >= profile.revision ? saved : profile
  const selected = { ...stored, ...draft }
  function change(fields: PreferencesInput, done?: () => void) {
    if (operationsPaused()) {
      setError('Espere a atualização terminar antes de salvar.')
      return
    }
    setDraft((current) => ({ ...current, ...fields }))
    waiting.current++
    const finish = beginOperation()
    queue.current = queue.current.then(async () => {
      try {
        setSaved(await updatePreferences(db, context, fields))
        setError('')
        done?.()
      } catch (reason) {
        setError(errorMessage(reason))
      } finally {
        finish()
        if (--waiting.current === 0) setDraft({})
      }
    })
  }
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Do seu jeito</p>
          <PageHeading title="Ajustes" />
          <p className="muted">Um pouco mais de você em cada check.</p>
        </div>
      </div>
      <div className="stack">
        <div className={styles.card}>
          <h2 style={{ fontSize: 20 }}>Na sua tela de início</h2>
          <p className="muted">Um toque para abrir suas listas.</p>
          <InstallButton />
        </div>
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
                onChange={() => {
                  change({ themeId: theme }, () => {
                    show(`Tema ${themeLabels[theme]} aplicado!`)
                  })
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
          {storage && (
            <p className="muted" style={{ fontSize: 14 }}>
              {storage.usage !== null &&
                `O Cartoon Check ocupa ${formatBytes(storage.usage)} neste dispositivo, contando o próprio aplicativo. `}
              {storage.persistence === 'persisted'
                ? 'O navegador protege estes dados da limpeza automática.'
                : storage.persistence === 'best-effort'
                  ? 'O navegador pode liberar este espaço se o dispositivo ficar cheio.'
                  : 'Este navegador não informa o armazenamento.'}
            </p>
          )}
          {storage?.persistence !== 'persisted' && (
            <CartoonButton
              variant="quiet"
              onClick={() => {
                void requestPersistence().then(async (persistence) => {
                  setStorage(await readStorageState())
                  show(
                    persistence === 'persisted'
                      ? 'Armazenamento protegido neste navegador.'
                      : persistence === 'best-effort'
                        ? 'Este navegador ainda pode liberar espaço. Mantenha um backup dos seus dados.'
                        : 'Este navegador não oferece proteção de armazenamento. Mantenha um backup.',
                  )
                })
              }}
            >
              Proteger armazenamento local
            </CartoonButton>
          )}
          <p className="muted" style={{ fontSize: 14, margin: '16px 0 0' }}>
            Versão {__APP_VERSION__}
          </p>
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
