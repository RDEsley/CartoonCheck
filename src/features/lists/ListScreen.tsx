import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  ArchiveRestore,
} from 'lucide-react'
import { useRuntime } from '../../app/context'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { EmptyState } from '../../components/EmptyState'
import { ProgressMeter } from '../../components/ProgressMeter'
import { useTask } from '../../hooks/useTask'
import { getListSummary } from './queries'
import { archiveList, deleteList, reactivateList } from './commands'
import { ListEditor } from './ListEditor'
import type { ShoppingList } from '../../db/models'
import styles from '../../app/layout.module.css'
import { ItemsPanel } from '../items/ItemsPanel'
import { motion } from 'motion/react'
import { springs } from '../../animations/tokens'
import { ListTotals } from './ListTotals'

export function ListScreen() {
  const { listId = '' } = useParams()
  const { db, context } = useRuntime()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const summary = useLiveQuery(() => getListSummary(db, listId), [db, listId])
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState<ShoppingList | null>(null)
  const [deleting, setDeleting] = useState<ShoppingList | null>(null)
  const { pending, error, run } = useTask()
  if (summary === undefined) return <p role="status">Abrindo lista…</p>
  if (summary === null)
    return (
      <EmptyState
        title="Esta lista não está aqui."
        description="Ela pode ter sido excluída em outra aba."
      >
        <Link to="/app">Voltar às listas</Link>
      </EmptyState>
    )
  const { list, pendingCount, purchasedCount, progress } = summary
  return (
    <>
      <Link
        to="/app"
        className="row"
        style={{ marginBottom: 24, minHeight: 48 }}
      >
        <ArrowLeft size={20} />
        Suas listas
      </Link>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {list.status === 'archived' ? 'Lista arquivada' : 'Bora dar check?'}
          </p>
          <h1
            id="page-title"
            tabIndex={-1}
            style={{ overflowWrap: 'anywhere' }}
          >
            {list.emoji} {list.name}
          </h1>
          <p className="muted">
            {pendingCount} para comprar ·{' '}
            <motion.span
              key={purchasedCount}
              style={{ display: 'inline-block' }}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={springs.bouncy}
            >
              {purchasedCount} comprados
            </motion.span>
          </p>
        </div>
        <CartoonButton
          variant="quiet"
          aria-label="Opções da lista"
          onClick={() => {
            setMenu(true)
          }}
        >
          <MoreHorizontal size={22} />
        </CartoonButton>
      </div>
      <ProgressMeter value={progress} />
      <ListTotals list={list} />
      <ItemsPanel key={list.id} list={list} />
      {menu && (
        <BottomSheet
          open
          onOpenChange={setMenu}
          title="Sua lista, seu jeito"
          description={list.name}
        >
          <div className="stack">
            {list.status === 'active' && (
              <CartoonButton
                variant="quiet"
                onClick={() => {
                  setMenu(false)
                  setEditing(list)
                }}
              >
                <Pencil size={20} />
                Editar lista
              </CartoonButton>
            )}
            <CartoonButton
              variant="quiet"
              disabled={pending}
              onClick={() => {
                void run(
                  () =>
                    list.status === 'active'
                      ? archiveList(db, context, list.id)
                      : reactivateList(db, context, list.id),
                  () => {
                    setMenu(false)
                  },
                )
              }}
            >
              {list.status === 'active' ? (
                <Archive size={20} />
              ) : (
                <ArchiveRestore size={20} />
              )}
              {list.status === 'active' ? 'Arquivar lista' : 'Reativar lista'}
            </CartoonButton>
            <CartoonButton
              variant="danger"
              onClick={() => {
                setMenu(false)
                setDeleting(list)
              }}
            >
              <Trash2 size={20} />
              Excluir lista
            </CartoonButton>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </BottomSheet>
      )}
      {(editing ?? (search.has('listEdit') ? list : null)) && (
        <ListEditor
          list={editing ?? list}
          close={() => {
            setEditing(null)
            search.delete('listEdit')
            setSearch(search, { replace: true })
          }}
        />
      )}
      {deleting && (
        <BottomSheet
          open
          onOpenChange={(open) => {
            if (!open && !pending) setDeleting(null)
          }}
          title="Excluir esta lista?"
          description={`“${deleting.name}” e todos os seus itens serão excluídos. Esta ação não pode ser desfeita.`}
        >
          <div className="stack">
            <CartoonButton
              variant="quiet"
              onClick={() => {
                setDeleting(null)
              }}
            >
              Manter lista
            </CartoonButton>
            <CartoonButton
              variant="danger"
              disabled={pending}
              onClick={() => {
                void run(
                  () => deleteList(db, context, deleting.id, deleting.revision),
                  () => {
                    void navigate('/app')
                    setDeleting(null)
                  },
                )
              }}
            >
              Excluir definitivamente
            </CartoonButton>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  )
}
