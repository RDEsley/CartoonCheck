import { useState } from 'react'
import { useRuntime } from '../../app/context'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { currencies } from '../../db/models'
import type { ShoppingList } from '../../db/models'
import { useTask } from '../../hooks/useTask'
import { createList, updateList } from './commands'
import { canonicalRate } from '../../lib/money'
import { useFormDraft } from '../../hooks/useFormDraft'
import { discardDraft, initialDraftField } from '../../pwa/drafts'

export function ListEditor({
  list: sourceList = null,
  close,
  onCreated,
}: {
  list?: ShoppingList | null
  close: () => void
  onCreated?: (id: string) => void
}) {
  const [list] = useState(sourceList)
  const { db, context } = useRuntime()
  const scope = list ? `list:${list.id}` : 'list:new'
  const revision = list?.revision ?? 0
  const initial = (field: string, fallback: string) =>
    initialDraftField(scope, context.datasetEpoch, revision, field, fallback)
  const [name, setName] = useState(() => initial('name', list?.name ?? ''))
  const [emoji, setEmoji] = useState(() => initial('emoji', list?.emoji ?? '✦'))
  const [currency, setCurrency] = useState<ShoppingList['currency']>(
    () =>
      currencies.find(
        (value) => value === initial('currency', list?.currency ?? 'BRL'),
      ) ?? 'BRL',
  )
  const { pending, error, run } = useTask()
  const [secondary, setSecondary] = useState<ShoppingList['secondaryCurrency']>(
    () =>
      currencies.find(
        (value) =>
          value === initial('secondary', list?.secondaryCurrency ?? ''),
      ) ?? null,
  )
  const [rate, setRate] = useState(() =>
    initial('rate', list?.manualExchangeRate ?? ''),
  )
  useFormDraft(
    scope,
    revision,
    list ? `/app/lists/${list.id}?listEdit=1` : '/app?new=1',
    { name, emoji, currency, secondary: secondary ?? '', rate },
    {
      name: list?.name ?? '',
      emoji: list?.emoji ?? '✦',
      currency: list?.currency ?? 'BRL',
      secondary: list?.secondaryCurrency ?? '',
      rate: list?.manualExchangeRate ?? '',
    },
  )
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) {
          discardDraft(scope)
          close()
        }
      }}
      title={list ? 'Editar lista' : 'Nova lista'}
      description="Uma lista para o que você quiser."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          const fields = {
            name,
            emoji: emoji.trim() || null,
            currency,
            secondaryCurrency: secondary,
            manualExchangeRate: secondary ? canonicalRate(rate) : null,
          }
          void run(
            () =>
              list
                ? updateList(db, context, list.id, fields, list.revision)
                : createList(db, context, fields),
            (result) => {
              discardDraft(scope)
              close()
              if (!list) onCreated?.(result.id)
            },
          )
        }}
      >
        <label>
          Nome da lista
          <input
            data-autofocus
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
            aria-label="Moeda"
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
        <details>
          <summary style={{ minHeight: 48, cursor: 'pointer' }}>
            Cotação manual (opcional)
          </summary>
          <div className="stack" style={{ paddingTop: 12 }}>
            <label>
              Moeda secundária
              <select
                aria-label="Moeda secundária"
                value={secondary ?? ''}
                onChange={(event) => {
                  setSecondary(
                    currencies.find((value) => value === event.target.value) ??
                      null,
                  )
                }}
              >
                <option value="">Não mostrar conversão</option>
                {currencies
                  .filter((value) => value !== currency)
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
            {secondary && (
              <label>
                1 {currency} vale quantos {secondary}?
                <input
                  inputMode="decimal"
                  value={rate}
                  onChange={(event) => {
                    setRate(event.target.value)
                  }}
                  required
                />
              </label>
            )}
            <p className="muted">
              Você define a cotação. A conversão é uma referência; não
              consultamos taxas na internet.
            </p>
          </div>
        </details>
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
