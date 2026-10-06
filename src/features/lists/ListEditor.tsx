import { useState } from 'react'
import { useRuntime } from '../../app/context'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { currencies } from '../../db/models'
import type { ShoppingList } from '../../db/models'
import { useTask } from '../../hooks/useTask'
import { createList, updateList } from './commands'

export function ListEditor({
  list = null,
  close,
  onCreated,
}: {
  list?: ShoppingList | null
  close: () => void
  onCreated?: (id: string) => void
}) {
  const { db, context } = useRuntime()
  const [name, setName] = useState(list?.name ?? '')
  const [emoji, setEmoji] = useState(list?.emoji ?? '✦')
  const [currency, setCurrency] = useState<ShoppingList['currency']>(
    list?.currency ?? 'BRL',
  )
  const { pending, error, run } = useTask()
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
      title={list ? 'Editar lista' : 'Nova lista'}
      description="Uma lista para o que você quiser."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          const fields = { name, emoji: emoji.trim() || null, currency }
          void run(
            () =>
              list
                ? updateList(db, context, list.id, fields, list.revision)
                : createList(db, context, fields),
            (result) => {
              close()
              if (!list) onCreated?.(result.id)
            },
          )
        }}
      >
        <label>
          Nome da lista
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            maxLength={120}
            required
            placeholder="Japão, Mercado, Presentes…"
          />
        </label>
        <div className="row">
          {['🇯🇵', '🛒', '🎁', '🏠', '👟', '✦'].map((value) => (
            <CartoonButton
              key={value}
              variant={emoji === value ? 'secondary' : 'quiet'}
              aria-label={`Usar ${value}`}
              aria-pressed={emoji === value}
              onClick={() => {
                setEmoji(value)
              }}
            >
              {value}
            </CartoonButton>
          ))}
        </div>
        <label>
          Emoji
          <input
            value={emoji}
            maxLength={16}
            onChange={(event) => {
              setEmoji(event.target.value)
            }}
          />
        </label>
        <label>
          Moeda
          <select
            value={currency}
            onChange={(event) => {
              const value = currencies.find(
                (entry) => entry === event.target.value,
              )
              if (value) setCurrency(value)
            }}
          >
            {currencies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <CartoonButton type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Salvando…' : list ? 'Salvar lista' : 'Criar lista'}
        </CartoonButton>
      </form>
    </BottomSheet>
  )
}
