import { useSyncExternalStore } from 'react'
import { CartoonButton } from '../components/CartoonButton'
import { applyUpdate, getPwaStatus, subscribePwa } from './status'
export function PwaStatus() {
  const status = useSyncExternalStore(subscribePwa, getPwaStatus)
  if (import.meta.env.DEV) return null
  return (
    <aside
      aria-label="Estado do aplicativo"
      style={{ marginBottom: 24, fontSize: 14 }}
    >
      {status.needRefresh ? (
        <div className="stack">
          <strong>Uma nova versão está pronta.</strong>
          <CartoonButton
            variant="quiet"
            disabled={status.updating}
            onClick={() => {
              void applyUpdate()
            }}
          >
            {status.updating ? 'Atualizando…' : 'Atualizar Cartoon Check'}
          </CartoonButton>
        </div>
      ) : (
        <span className="muted" role="status">
          {status.offlineReady
            ? '✓ Pronto para usar offline'
            : 'Preparando o uso offline…'}
        </span>
      )}
      {status.message && (
        <p role="status" className="muted" style={{ marginTop: 12 }}>
          {status.message}
        </p>
      )}
    </aside>
  )
}
