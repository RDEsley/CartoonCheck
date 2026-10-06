import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'
import { motion } from 'motion/react'
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
export function ShoppingItemCard({
  id,
  archived,
  edit,
  changed,
  currency,
}: {
  id: string
  archived: boolean
  edit: (item: ShoppingItem) => void
  changed: (notice: string) => void
  currency: ShoppingList['currency']
}) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const { purchase } = useCelebrations()
  const card = useRef<HTMLLIElement>(null)
  const item = useLiveQuery(() => db.items.get(id), [db, id])
  const { pending, error, run } = useTask()
  if (!item) return null
  const purchased = item.status === 'purchased'
  return (
    <motion.li
      ref={card}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.normal }}
      className={styles.item}
      data-purchased={purchased}
    >
      <CartoonCheckbox
        checked={purchased}
        label={`${purchased ? 'Desmarcar' : 'Comprar'} ${item.name}`}
        disabled={archived || pending}
        onChange={() => {
          const rect = card.current?.getBoundingClientRect()
          void run(
            () => setPurchased(db, context, id, !purchased),
            (result) => {
              if (rect) purchase(result, rect)
              if (result.changed)
                show(purchased ? 'Compra desfeita.' : 'Comprado! ✨', {
                  kind: 'purchase',
                  result,
                })
              if (result.changed)
                changed(
                  purchased
                    ? 'Compra desfeita.'
                    : result.listCompleted
                      ? 'Lista completa! 🎉 Você conseguiu tudo.'
                      : 'Comprado! ✨',
                )
              requestAnimationFrame(() => {
                const target =
                  document.querySelector<HTMLButtonElement>(
                    '[data-item-list] [role="checkbox"]',
                  ) ??
                  document.querySelector<HTMLButtonElement>(
                    '[role="tab"][aria-selected="true"]',
                  )
                target?.focus()
              })
            },
          )
        }}
      />
      {item.photoId && <StoredImage id={item.photoId} />}
      <button
        className={styles.itemName}
        onClick={() => {
          edit(item)
        }}
        disabled={archived}
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
    </motion.li>
  )
}
