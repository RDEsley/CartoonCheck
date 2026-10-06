import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { useRuntime } from '../../app/context'
import type { ShoppingItem, ShoppingList } from '../../db/models'
import { EmptyState } from '../../components/EmptyState'
import { CartoonButton } from '../../components/CartoonButton'
import { getItemIds } from './queries'
import { ShoppingItemCard } from './ShoppingItemCard'
import { QuickAdd } from './QuickAdd'
import { ItemEditor } from './ItemEditor'
import { ItemDetails } from './ItemDetails'
import styles from './items.module.css'
import { useSearchParams } from 'react-router'
export function ItemsPanel({
  list,
  purchasedCount,
}: {
  list: ShoppingList
  purchasedCount: number
}) {
  const { db } = useRuntime()
  const [search, setSearch] = useSearchParams()
  const requestedId = search.get('itemEdit')
  const requestedItem = useLiveQuery(
    () => (requestedId ? db.items.get(requestedId) : undefined),
    [db, requestedId],
  )
  const [tab, setTab] = useState<ShoppingItem['status']>('pending')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const editedItem = editing ?? requestedItem ?? null
  const tabs = useRef<HTMLDivElement>(null)
  const closeItem = () => {
    setEditing(null)
    search.delete('itemEdit')
    setSearch(search, { replace: true })
  }
  const ids = useLiveQuery(
    () => getItemIds(db, list.id, tab),
    [db, list.id, tab],
  )
  return (
    <>
      <div
        role="tablist"
        aria-label="Itens da lista"
        className={styles.tabs}
        ref={tabs}
      >
        {(['pending', 'purchased'] as const).map((value) => (
          <button
            key={value}
            id={`tab-${value}`}
            role="tab"
            aria-selected={tab === value}
            aria-controls="items-panel"
            tabIndex={tab === value ? 0 : -1}
            onClick={() => {
              setTab(value)
            }}
            onKeyDown={(event) => {
              if (
                ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)
              ) {
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'pending'
                    : event.key === 'End'
                      ? 'purchased'
                      : tab === 'pending'
                        ? 'purchased'
                        : 'pending'
                setTab(next)
                tabs.current
                  ?.querySelector<HTMLButtonElement>(`#tab-${next}`)
                  ?.focus()
              }
            }}
          >
            {value === 'pending' ? 'Quero comprar' : 'Comprei'}
          </button>
        ))}
      </div>
      <section
        id="items-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {ids === undefined ? (
          <p role="status">Abrindo itens…</p>
        ) : ids.length === 0 ? (
          <EmptyState
            title={
              tab === 'purchased'
                ? 'Ainda não rolou nenhum check ✨'
                : purchasedCount > 0
                  ? 'Nada pendente por aqui.'
                  : 'Nada aqui ainda.'
            }
            description={
              tab === 'purchased'
                ? 'Quando você comprar, o item vem para cá.'
                : purchasedCount > 0
                  ? 'Adicione algo quando quiser.'
                  : 'Vamos colocar alguma coisa nessa lista?'
            }
          />
        ) : (
          <ul className={styles.items} data-item-list>
            {ids.map((id) => (
              <ShoppingItemCard
                key={id}
                id={id}
                currency={list.currency}
                archived={list.status === 'archived'}
                edit={setEditing}
              />
            ))}
          </ul>
        )}
      </section>
      {list.status === 'active' && (
        <CartoonButton
          className={styles.addButton}
          data-add-item
          onClick={() => {
            setAdding(true)
          }}
        >
          <Plus size={22} />
          Adicionar
        </CartoonButton>
      )}
      {(adding || search.has('add')) && (
        <QuickAdd
          listId={list.id}
          close={() => {
            setAdding(false)
            search.delete('add')
            setSearch(search, { replace: true })
          }}
          added={() => {
            setTab('pending')
          }}
        />
      )}
      {editedItem && list.status === 'active' && (
        <ItemEditor item={editedItem} list={list} close={closeItem} />
      )}
      {editedItem && list.status === 'archived' && (
        <ItemDetails
          item={editedItem}
          currency={list.currency}
          close={closeItem}
        />
      )}
    </>
  )
}
