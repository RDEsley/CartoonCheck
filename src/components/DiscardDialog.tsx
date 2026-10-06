import { BottomSheet } from './BottomSheet'
import { CartoonButton } from './CartoonButton'
/** Asks before a sheet with unsaved changes is closed. */
export function DiscardDialog({
  keep,
  discard,
}: {
  keep: () => void
  discard: () => void
}) {
  return (
    <BottomSheet
      open
      alert
      onOpenChange={(open) => {
        if (!open) keep()
      }}
      title="Descartar alterações?"
      description="O que você mudou aqui ainda não foi salvo."
    >
      <div className="stack">
        <CartoonButton variant="quiet" data-autofocus onClick={keep}>
          Continuar editando
        </CartoonButton>
        <CartoonButton variant="danger" onClick={discard}>
          Descartar alterações
        </CartoonButton>
      </div>
    </BottomSheet>
  )
}
