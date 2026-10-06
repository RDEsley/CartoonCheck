import { CartoonButton } from '../components/CartoonButton'
import { discardDraft, downloadDraft } from './drafts'
/** Shown instead of a form whose stored draft was made before its data changed. */
export function DraftConflict() {
  return (
    <div className="stack">
      <p className="error" role="alert">
        Há um rascunho desta edição feito antes de os dados mudarem. Guarde uma
        cópia ou descarte o rascunho para editar a versão atual.
      </p>
      <CartoonButton
        variant="quiet"
        data-autofocus
        onClick={() => {
          void downloadDraft()
        }}
      >
        Guardar rascunho
      </CartoonButton>
      <CartoonButton
        variant="danger"
        onClick={() => {
          discardDraft()
        }}
      >
        Descartar rascunho
      </CartoonButton>
    </div>
  )
}
