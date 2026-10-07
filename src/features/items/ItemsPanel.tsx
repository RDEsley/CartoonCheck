import { useCallback, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, RotateCcw } from 'lucide-react'
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
import layout from '../../app/layout.module.css'
import { useSearchParams } from 'react-router'
// Long lists are revealed in steps: only the cards near the screen exist,
// which keeps opening and checking fast with hundreds of items.
const step = 60
export function ItemsPanel({
  list,
  purchasedCount,
  restart,
}: {
  list: ShoppingList
  purchasedCount: number
  /** Offered when everything was bought and the list can start over. */
  restart: () => void
}) {
  const { db } = useRuntime()
  const [search, setSearch] = useSearchParams()
  const requestedId = search.get('itemEdit')
  const requestedItem = useLiveQuery(
    () => (requestedId ? db.items.get(requestedId) : undefined),
    [db, requestedId],
  )
  const [tab, selectTab] = useState<ShoppingItem['status']>('pending')
  const [shown, setShown] = useState(step)
  const setTab = (next: ShoppingItem['status']) => {
    selectTab(next)
    setShown(step)
  }
  // The button reveals the next step by itself as it approaches the screen.
  const revealNearby = useCallback((button: HTMLButtonElement | null) => {
    if (button === null || typeof IntersectionObserver !== 'function') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          setShown((count) => count + step)
      },
      { rootMargin: '600px' },
    )
    observer.observe(button)
    return () => {
      observer.disconnect()
    }
  }, [])
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
          >
            {tab === 'pending' &&
              purchasedCount > 0 &&
              list.status === 'active' && (
                <CartoonButton variant="quiet" onClick={restart}>
                  <RotateCcw size={20} />
                  Recomeçar lista
                </CartoonButton>
              )}
          </EmptyState>
        ) : (
          <ul className={styles.items} data-item-list>
            {ids.slice(0, shown).map((id) => (
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
        {ids !== undefined && ids.length > shown && (
          <CartoonButton
            ref={revealNearby}
            variant="quiet"
            className={styles.more}
            onClick={() => {
              setShown((count) => count + step)
            }}
          >
            Mostrar mais itens ({ids.length - shown} restantes)
          </CartoonButton>
        )}
      </section>
      {list.status === 'active' && (
        <CartoonButton
          className={layout.dockAction}
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
