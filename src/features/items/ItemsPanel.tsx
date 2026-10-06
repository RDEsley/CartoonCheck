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
import styles from './items.module.css'
export function ItemsPanel({ list }: { list: ShoppingList }) {
  const { db } = useRuntime()
  const [tab, setTab] = useState<ShoppingItem['status']>('pending')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [notice, setNotice] = useState('')
  const tabs = useRef<HTMLDivElement>(null)
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
              tab === 'pending'
                ? 'Nada aqui ainda.'
                : 'Ainda não rolou nenhum check ✨'
            }
            description={
              tab === 'pending'
                ? 'Vamos colocar alguma coisa nessa lista?'
                : 'Quando você comprar, o item vem para cá.'
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
                changed={setNotice}
              />
            ))}
          </ul>
        )}
      </section>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      {list.status === 'active' && (
        <CartoonButton
          className={styles.addButton}
          onClick={() => {
            setAdding(true)
          }}
        >
          <Plus size={22} />
          Adicionar
        </CartoonButton>
      )}
      {adding && (
        <QuickAdd
          listId={list.id}
          close={() => {
            setAdding(false)
          }}
          added={() => {
            setTab('pending')
          }}
        />
      )}
      {editing && (
        <ItemEditor
          item={editing}
          list={list}
          close={() => {
            setEditing(null)
          }}
          changed={setNotice}
        />
      )}
    </>
  )
}
