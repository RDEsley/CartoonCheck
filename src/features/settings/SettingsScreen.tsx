import { Link } from 'react-router'
import { useEffect, useState } from 'react'
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
import { InstallButton } from '../install/InstallButton'
import { PageHeading } from '../../components/PageHeading'
import { appVersion } from '../../app/version'
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
  // Controls stay enabled while saving so keyboard focus is not dropped;
  // the task ignores a change that arrives before the previous one is stored.
  const { error, run } = useTask()
  const [local, setLocal] = useState<Profile | null>(null)
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
  const selected = local?.revision === profile.revision ? local : profile
  function change(
    fields: Partial<Pick<Profile, 'reduceMotion' | 'hapticsEnabled'>>,
  ) {
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
            Versão {appVersion}
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
