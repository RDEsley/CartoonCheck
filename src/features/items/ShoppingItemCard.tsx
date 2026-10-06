import { useLiveQuery } from 'dexie-react-hooks'
import { memo, useRef } from 'react'
import * as m from 'motion/react-m'
import { duration } from '../../animations/tokens'
import { useCelebrations } from '../../celebrations/context'
import { useRuntime } from '../../app/context'
import { CartoonCheckbox } from '../../components/CartoonCheckbox'
import { useTask } from '../../hooks/useTask'
import type { ShoppingItem } from '../../db/models'
import { setPurchased } from './commands'
import styles from './items.module.css'
import { useFeedback } from '../../app/feedback-context'
import { StoredImage } from '../../components/StoredImage'
import { formatPrice } from '../../lib/money'
import type { ShoppingList } from '../../db/models'
function neighborCheckbox(card: HTMLElement | null) {
  const boxes = Array.from(
    card
      ?.closest('[data-item-list]')
      ?.querySelectorAll<HTMLElement>('[role="checkbox"]') ?? [],
  )
  const index = boxes.findIndex((box) => card?.contains(box))
  return boxes[index + 1] ?? boxes[index - 1] ?? null
}
// Memoized: a change in one item must not re-render every other card.
export const ShoppingItemCard = memo(function ShoppingItemCard({
  id,
  archived,
  edit,
  currency,
}: {
  id: string
  archived: boolean
  edit: (item: ShoppingItem) => void
  currency: ShoppingList['currency']
}) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const { purchase } = useCelebrations()
  const card = useRef<HTMLLIElement>(null)
  const item = useLiveQuery(() => db.items.get(id), [db, id])
  const { pending, error, run } = useTask()
  // The space is kept while the item loads, so the list does not jump.
  if (!item) return <li className={styles.placeholder} aria-hidden="true" />
  const purchased = item.status === 'purchased'
  return (
    <m.li
      ref={card}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.normal }}
      className={styles.item}
      data-item-id={id}
      data-purchased={purchased}
    >
      <CartoonCheckbox
        checked={purchased}
        label={`${purchased ? 'Desmarcar' : 'Comprar'} ${item.name}`}
        disabled={archived || pending}
        onChange={(viaKeyboard) => {
          const rect = card.current?.getBoundingClientRect()
          // The item leaves this tab once saved; a pointer keeps its place, a keyboard needs a new one.
          const neighbor = viaKeyboard ? neighborCheckbox(card.current) : null
          void run(
            () => setPurchased(db, context, id, !purchased),
            (result) => {
              if (rect) purchase(result, rect)
              if (result.changed)
                show(purchased ? 'Compra desfeita.' : 'Comprado! ✨', {
                  kind: 'purchase',
                  result,
                })
              if (viaKeyboard)
                (neighbor?.isConnected
                  ? neighbor
                  : document.querySelector<HTMLElement>('[data-add-item]')
                )?.focus()
            },
          ).then((saved) => {
            if (!saved && viaKeyboard)
              requestAnimationFrame(() => {
                card.current
                  ?.querySelector<HTMLElement>('[role="checkbox"]')
                  ?.focus()
              })
          })
        }}
      />
      {item.photoId && <StoredImage id={item.photoId} />}
      <button
        className={styles.itemName}
        onClick={() => {
          edit(item)
        }}
      >
        <span>{item.name}</span>
        {(purchased ? item.paidPriceMinor : item.plannedPriceMinor) !==
          null && (
          <small className="muted">
            {formatPrice(
              (purchased ? item.paidPriceMinor : item.plannedPriceMinor) ?? 0,
              currency,
            )}
          </small>
        )}
        {item.quantity > 1 && (
          <small className="muted">Quantidade: {item.quantity}</small>
        )}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </m.li>
  )
})
