import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useRuntime } from '../../app/context'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { useTask } from '../../hooks/useTask'
import { addItem } from './commands'
import { useFeedback } from '../../app/feedback-context'
import { useCelebrations } from '../../celebrations/context'
import { useFormDraft } from '../../hooks/useFormDraft'
import { discardDraft, initialDraftField } from '../../pwa/drafts'
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
  const { cancel } = useCelebrations()
  const scope = `add:${listId}`
  const [name, setName] = useState(() =>
    initialDraftField(scope, context.datasetEpoch, 0, 'name', ''),
  )
  // A leftover draft from replaced data has nothing this form could restore.
  useFormDraft(
    scope,
    0,
    `/app/lists/${listId}?add=1`,
    { name },
    { name: '' },
    true,
  )
  const input = useRef<HTMLInputElement>(null)
  const { pending, error, run } = useTask()
  const [notice, setNotice] = useState('')
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) {
          discardDraft(scope)
          close()
        }
      }}
      title="O que você quer adicionar?"
      description="Só o nome. Os detalhes ficam para depois."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          const submitted = name
          void run(
            () => addItem(db, context, listId, { name: submitted }),
            (item) => {
              // Whatever was typed while this item was being saved stays.
              setName((current) => (current === submitted ? '' : current))
              discardDraft(scope)
              cancel()
              setNotice(`${item.name} adicionado!`)
              show(`${item.name} adicionado!`)
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
            data-autofocus
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setNotice('')
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
        {/* Announced by the feedback region, which stays exposed above the sheet. */}
        <p className="muted" style={{ minHeight: 24, marginBottom: 0 }}>
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
