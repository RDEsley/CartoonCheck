import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '../../app/context'
import { EmptyState } from '../../components/EmptyState'
import { CartoonButton } from '../../components/CartoonButton'
import type { HistoryEntry } from '../../db/models'
import { getHistoryCount, getHistoryPage } from './queries'
import { PageHeading } from '../../components/PageHeading'
import styles from '../../app/layout.module.css'
const labels: Record<HistoryEntry['action'], string> = {
  list_created: 'Lista criada',
  list_archived: 'Lista arquivada',
  list_reactivated: 'Lista reativada',
  list_deleted: 'Lista excluída',
  list_completed: 'Lista completa 🎉',
  list_restarted: 'Lista recomeçada',
  item_added: 'Item adicionado',
  item_purchased: 'Comprado ✨',
  item_purchase_undone: 'Compra desfeita',
  item_removed: 'Item removido',
  item_restored: 'Item restaurado',
}
const time = { hour: '2-digit', minute: '2-digit' } as const
const thisYear = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  ...time,
})
const otherYears = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  ...time,
})
function formatDate(occurredAt: number) {
  const sameYear =
    new Date(occurredAt).getFullYear() === new Date().getFullYear()
  return (sameYear ? thisYear : otherYears).format(occurredAt)
}
export function HistoryScreen() {
  const { db } = useRuntime()
  const [page, setPage] = useState(0)
  const entries = useLiveQuery(() => getHistoryPage(db, page), [db, page])
  const total = useLiveQuery(() => getHistoryCount(db), [db])
  const hasOlder = total !== undefined && (page + 1) * 50 < total
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Pequenas conquistas</p>
          <PageHeading title="Seu histórico" />
          <p className="muted">O caminho de cada check.</p>
        </div>
      </div>
      {entries === undefined ? (
        <p role="status">Abrindo histórico…</p>
      ) : entries.length === 0 && page === 0 ? (
        <EmptyState
          title="O primeiro check está por vir."
          description="Suas listas e compras contam essa história."
        />
      ) : (
        <ol className="stack" style={{ listStyle: 'none', padding: 0 }}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.card}>
              <strong>{labels[entry.action]}</strong>
              <p style={{ margin: '8px 0', overflowWrap: 'anywhere' }}>
                {entry.itemName ?? entry.listName}
              </p>
              <small className="muted">
                {entry.itemName !== null && `${entry.listName} · `}
                <time dateTime={new Date(entry.occurredAt).toISOString()}>
                  {formatDate(entry.occurredAt)}
                </time>
              </small>
            </li>
          ))}
        </ol>
      )}
      <div className="row" style={{ marginTop: 24 }}>
        <CartoonButton
          variant="quiet"
          disabled={page === 0}
          onClick={() => {
            setPage((value) => value - 1)
          }}
        >
          Mais recentes
        </CartoonButton>
        <CartoonButton
          variant="quiet"
          disabled={!hasOlder}
          onClick={() => {
            setPage((value) => value + 1)
          }}
        >
          Mais antigos
        </CartoonButton>
      </div>
    </>
  )
}
