import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useRuntime } from '../../app/context'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { useTask } from '../../hooks/useTask'
import { addItem } from './commands'
import { useFeedback } from '../../app/feedback-context'
export function QuickAdd({
  listId,
  close,
  added,
}: {
  listId: string
  close: () => void
  added: () => void
}) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const [name, setName] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { pending, error, run } = useTask()
  const [notice, setNotice] = useState('')
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
      title="O que você quer adicionar?"
      description="Só o nome. Os detalhes ficam para depois."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          void run(
            () => addItem(db, context, listId, { name }),
            (item) => {
              setName('')
              setNotice(`${item.name} adicionado!`)
              show('Item adicionado!', { kind: 'add', item })
              added()
              input.current?.focus()
            },
          )
        }}
      >
        <label>
          Nome do item
          <input
            ref={input}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.nativeEvent.isComposing)
                event.preventDefault()
            }}
            maxLength={120}
            required
            enterKeyHint="done"
            autoComplete="off"
            placeholder="Nintendo Switch 2…"
          />
        </label>
        <CartoonButton type="submit" disabled={pending || !name.trim()}>
          <Plus size={22} />
          {pending ? 'Adicionando…' : 'Adicionar'}
        </CartoonButton>
        <p
          role="status"
          className="muted"
          style={{ minHeight: 24, marginBottom: 0 }}
        >
          {notice}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
