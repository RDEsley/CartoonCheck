import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '../../app/context'
import { CartoonCheckbox } from '../../components/CartoonCheckbox'
import { useTask } from '../../hooks/useTask'
import type { ShoppingItem } from '../../db/models'
import { setPurchased } from './commands'
import styles from './items.module.css'
import { useFeedback } from '../../app/feedback-context'
export function ShoppingItemCard({
  id,
  archived,
  edit,
  changed,
}: {
  id: string
  archived: boolean
  edit: (item: ShoppingItem) => void
  changed: (notice: string) => void
}) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const item = useLiveQuery(() => db.items.get(id), [db, id])
  const { pending, error, run } = useTask()
  if (!item) return null
  const purchased = item.status === 'purchased'
  return (
    <li className={styles.item} data-purchased={purchased}>
      <CartoonCheckbox
        checked={purchased}
        label={`${purchased ? 'Desmarcar' : 'Comprar'} ${item.name}`}
        disabled={archived || pending}
        onChange={() => {
          void run(
            () => setPurchased(db, context, id, !purchased),
            (result) => {
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
      <button
        className={styles.itemName}
        onClick={() => {
          edit(item)
        }}
        disabled={archived}
      >
        <span>{item.name}</span>
        {item.quantity > 1 && (
          <small className="muted">Quantidade: {item.quantity}</small>
        )}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
