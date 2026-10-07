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
  RotateCcw,
} from 'lucide-react'
import { useRuntime } from '../../app/context'
import { useFeedback } from '../../app/feedback-context'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { EmptyState } from '../../components/EmptyState'
import { ProgressMeter } from '../../components/ProgressMeter'
import { useTask } from '../../hooks/useTask'
import { getListSummary } from './queries'
import {
  archiveList,
  deleteList,
  reactivateList,
  restartList,
} from './commands'
import { celebrations } from '../../celebrations/engine'
import { ListEditor } from './ListEditor'
import type { ShoppingList } from '../../db/models'
import styles from '../../app/layout.module.css'
import { ItemsPanel } from '../items/ItemsPanel'
import * as m from 'motion/react-m'
import { MotionBoundary } from '../../animations/MotionBoundary'
import { springs } from '../../animations/tokens'
import { ListTotals } from './ListTotals'
import { PageHeading } from '../../components/PageHeading'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function ListScreen() {
  const { listId = '' } = useParams()
  const { db, context } = useRuntime()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const summary = useLiveQuery(() => getListSummary(db, listId), [db, listId])
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState<ShoppingList | null>(null)
  const [deleting, setDeleting] = useState<ShoppingList | null>(null)
  const [restarting, setRestarting] = useState(false)
  const { pending, error, run } = useTask()
  const { show, dismiss } = useFeedback()
  useDocumentTitle(summary === null ? 'Lista não encontrada' : null)
  if (summary === undefined) return <p role="status">Abrindo lista…</p>
  if (summary === null)
    return (
      <EmptyState
        title="Esta lista não está aqui."
        description="Ela pode ter sido excluída em outra aba."
      >
        <Link to="/app" className="text-link">
          Voltar às listas
        </Link>
      </EmptyState>
    )
  const { list, pendingCount, purchasedCount, progress } = summary
  return (
    <MotionBoundary>
      <Link to="/app" className={styles.back}>
        <ArrowLeft size={20} />
        Suas listas
      </Link>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {list.status === 'archived' ? 'Lista arquivada' : 'Bora dar check?'}
          </p>
          <PageHeading key={list.id} title={list.name}>
            {list.emoji} {list.name}
          </PageHeading>
          <p className="muted">
            {pendingCount} para comprar ·{' '}
            <m.span
              key={purchasedCount}
              style={{ display: 'inline-block' }}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={springs.bouncy}
            >
              {purchasedCount} comprados
            </m.span>
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
      <ItemsPanel key={list.id} list={list} purchasedCount={purchasedCount} />
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
            {list.status === 'active' && purchasedCount > 0 && (
              <CartoonButton
                variant="quiet"
                onClick={() => {
                  setMenu(false)
                  setRestarting(true)
                }}
              >
                <RotateCcw size={20} />
                Recomeçar lista
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
                  (changed) => {
                    setMenu(false)
                    if (changed.revision !== list.revision)
                      show(
                        changed.status === 'archived'
                          ? 'Lista arquivada.'
                          : 'Lista reativada.',
                        { kind: 'archive', list: changed },
                      )
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
      {restarting && (
        <BottomSheet
          open
          onOpenChange={(open) => {
            if (!open && !pending) setRestarting(false)
          }}
          title="Recomeçar esta lista?"
          alert
          description={`${
            purchasedCount === 1
              ? 'O item comprado volta'
              : `Os ${String(purchasedCount)} itens comprados voltam`
          } para “Quero comprar” e o preço pago é apagado. Fotos, notas, preços planejados e o histórico continuam guardados.`}
        >
          <div className="stack">
            <CartoonButton
              variant="quiet"
              onClick={() => {
                setRestarting(false)
              }}
            >
              Manter como está
            </CartoonButton>
            <CartoonButton
              disabled={pending}
              onClick={() => {
                void run(
                  () => restartList(db, context, list.id, list.revision),
                  () => {
                    celebrations.cancel()
                    dismiss()
                    setRestarting(false)
                    show('Lista recomeçada. Bora de novo!')
                  },
                )
              }}
            >
              <RotateCcw size={20} />
              Recomeçar lista
            </CartoonButton>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </BottomSheet>
      )}
      {deleting && (
        <BottomSheet
          open
          onOpenChange={(open) => {
            if (!open && !pending) setDeleting(null)
          }}
          title="Excluir esta lista?"
          alert
          description={`“${deleting.name}” ${
            pendingCount + purchasedCount === 0
              ? 'será excluída'
              : pendingCount + purchasedCount === 1
                ? 'e seu item, com a foto se houver, serão excluídos'
                : `e seus ${String(pendingCount + purchasedCount)} itens, com as fotos, serão excluídos`
          }. Esta ação não pode ser desfeita.`}
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
    </MotionBoundary>
  )
}
