import { useSyncExternalStore } from 'react'
import { CartoonButton } from '../components/CartoonButton'
import { applyUpdate, deferUpdate, getPwaStatus, subscribePwa } from './status'
export function PwaStatus() {
  const status = useSyncExternalStore(subscribePwa, getPwaStatus)
  if (import.meta.env.DEV) return null
  const offer = status.needRefresh && !status.deferred
  return (
    <aside
      aria-label="Estado do aplicativo"
      style={{ marginBottom: 24, fontSize: 14 }}
    >
      {/* One region for every state, so a new version is announced when it arrives. */}
      <p
        role="status"
        className={offer ? undefined : 'muted'}
        style={{ margin: 0, fontWeight: offer ? 800 : undefined }}
      >
        {offer
          ? 'Uma nova versão está pronta.'
          : status.offlineReady
            ? '✓ Pronto para usar offline'
            : 'Preparando o uso offline…'}
      </p>
      {offer && (
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
      )}
      {status.message && (
        <p role="status" className="muted" style={{ marginTop: 12 }}>
          {status.message}
        </p>
      )}
    </aside>
  )
}
