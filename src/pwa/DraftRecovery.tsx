import { useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { useRuntime } from '../app/context'
import { CartoonButton } from '../components/CartoonButton'
import {
  discardDraft,
  getDraftSnapshot,
  subscribeDraft,
  downloadDraft,
} from './drafts'
export function DraftRecovery() {
  const { context } = useRuntime()
  const state = useSyncExternalStore(subscribeDraft, getDraftSnapshot)
  const navigate = useNavigate()
  if (!state.draft && !state.failed) return null
  return (
    <aside
      style={{
        border: '2px solid var(--ink)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 24,
      }}
      aria-label="Rascunho de edição"
    >
      <p className="muted">
        {state.failed
          ? 'Não conseguimos guardar o rascunho. Salve ou descarte a edição antes de atualizar.'
          : state.draft?.epoch !== context.datasetEpoch
            ? 'Este rascunho é de dados anteriores. Você pode guardar uma cópia.'
            : 'Você tem uma edição ainda não salva nesta aba.'}
      </p>
      <div className="row">
        {state.draft?.epoch === context.datasetEpoch && (
          <CartoonButton
            variant="quiet"
            onClick={() => {
              if (state.draft) void navigate(state.draft.route)
            }}
          >
            Retomar edição
          </CartoonButton>
        )}
        <CartoonButton
          variant="quiet"
          onClick={() => {
            void downloadDraft()
          }}
        >
          Guardar rascunho
        </CartoonButton>
        <CartoonButton
          variant="quiet"
          onClick={() => {
            discardDraft()
          }}
        >
          Descartar rascunho
        </CartoonButton>
      </div>
    </aside>
  )
}
