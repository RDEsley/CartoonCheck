import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRuntime } from '../../app/context'
import type { ShoppingItem } from '../../db/models'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { useTask } from '../../hooks/useTask'
import { deleteItem, updateItem } from './commands'
import { useFeedback } from '../../app/feedback-context'
export function ItemEditor({
  item,
  close,
  changed,
}: {
  item: ShoppingItem
  close: () => void
  changed: (notice: string) => void
}) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const [name, setName] = useState(item.name)
  const { pending, error, run } = useTask()
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
      title="Detalhes do item"
      description="Deixe do seu jeito."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          void run(
            () => updateItem(db, context, item.id, { name }, item.revision),
            () => {
              close()
              changed('Item atualizado!')
            },
          )
        }}
      >
        <label>
          Nome
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            maxLength={120}
            required
          />
        </label>
        <CartoonButton type="submit" disabled={pending || !name.trim()}>
          Salvar item
        </CartoonButton>
        <CartoonButton
          variant="danger"
          disabled={pending}
          onClick={() => {
            void run(
              () => deleteItem(db, context, item.id),
              (snapshot) => {
                close()
                changed('Item removido.')
                show('Item removido.', { kind: 'delete', snapshot })
              },
            )
          }}
        >
          <Trash2 size={20} />
          Excluir item
        </CartoonButton>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
