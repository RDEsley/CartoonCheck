import { useSyncExternalStore } from 'react'
import { CartoonButton } from '../components/CartoonButton'
import styles from '../app/layout.module.css'
import { applyUpdate, deferUpdate, getPwaStatus, subscribePwa } from './status'
function offlineText(ready: boolean) {
  return ready ? '✓ Pronto para usar offline' : 'Preparando o uso offline…'
}
/**
 * The shell only interrupts for what needs a decision: a new version. The
 * offline state is announced to assistive technology here and shown in the
 * settings, instead of taking a line of every screen.
 */
export function PwaStatus() {
  const status = useSyncExternalStore(subscribePwa, getPwaStatus)
  if (import.meta.env.DEV) return null
  const offer = status.needRefresh && !status.deferred
  return (
    <>
      <p role="status" className="sr-only">
        {offer
          ? 'Uma nova versão está pronta.'
          : offlineText(status.offlineReady)}
      </p>
      {(offer || status.message) && (
        <aside aria-label="Atualização do aplicativo" className={styles.notice}>
          {offer && (
            <>
              <strong>Uma nova versão está pronta.</strong>
              <div className="row" style={{ marginTop: 12 }}>
                <CartoonButton
                  variant="quiet"
                  busy={status.updating}
                  onClick={() => {
                    void applyUpdate()
                  }}
                >
                  {status.updating ? 'Atualizando…' : 'Atualizar Cartoon Check'}
                </CartoonButton>
                <CartoonButton
                  variant="quiet"
                  disabled={status.updating}
                  onClick={deferUpdate}
                >
                  Depois
                </CartoonButton>
              </div>
            </>
          )}
          {status.message && (
            <p
              role="status"
              className="hint"
              style={{ marginTop: offer ? 12 : 0 }}
            >
              {status.message}
            </p>
          )}
        </aside>
      )}
    </>
  )
}
export function OfflineStatus() {
  const status = useSyncExternalStore(subscribePwa, getPwaStatus)
  if (import.meta.env.DEV) return null
  return (
    <p className="hint" style={{ marginTop: 16 }}>
      {offlineText(status.offlineReady)}
    </p>
  )
}
