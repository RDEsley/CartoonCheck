import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { CartoonButton } from '../../components/CartoonButton'
import { ListEditor } from './ListEditor'
import { StoredImage } from '../../components/StoredImage'
import { useRuntime } from '../../app/context'
import { BrandArt } from '../../components/BrandArt'
import { EmptyState } from '../../components/EmptyState'
import { ListCard } from './ListCard'
import { getListIds } from './queries'
import { PageHeading } from '../../components/PageHeading'
import styles from '../../app/layout.module.css'
export function Home({ archived = false }: { archived?: boolean }) {
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const { db, profile } = useRuntime()
  const ids = useLiveQuery(
    () => getListIds(db, archived ? 'archived' : 'active'),
    [db, archived],
  )
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {archived ? 'Guardadas com carinho' : 'Um check de cada vez'}
          </p>
          <PageHeading
            key={String(archived)}
            title={archived ? 'Listas arquivadas' : 'Suas listas'}
          >
            {archived ? 'Listas arquivadas' : `Olá, ${profile?.name ?? ''} 👋`}
          </PageHeading>
          <p className="muted">
            {archived
              ? 'Reabra uma lista quando quiser.'
              : 'O que vamos comprar hoje?'}
          </p>
        </div>
        {profile?.photoId ? (
          <StoredImage id={profile.photoId} size={72} />
        ) : (
          <BrandArt kind={profile?.avatarPresetId ?? 'bag'} size={72} />
        )}
      </div>
      {!archived && (
        <h2 style={{ fontSize: 20, marginBottom: 24 }}>Suas listas</h2>
      )}
      {ids === undefined ? (
        <p role="status">Abrindo listas…</p>
      ) : ids.length === 0 ? (
        <EmptyState
          title={
            archived
              ? 'Nada guardado por aqui.'
              : 'Sua próxima lista começa aqui.'
          }
          description={
            archived
              ? 'Listas arquivadas aparecem neste espaço.'
              : 'Uma viagem, presentes ou só o mercado da semana.'
          }
        />
      ) : (
        <div className={styles.lists}>
          {ids.map((id) => (
            <ListCard key={id} id={id} />
          ))}
        </div>
      )}
      {!archived && (
        <CartoonButton
          style={{ width: '100%', marginTop: 28 }}
          onClick={() => {
            setCreating(true)
          }}
        >
          <Plus size={22} />
          Nova lista
        </CartoonButton>
      )}
      {(creating || search.has('new')) && !archived && (
        <ListEditor
          close={() => {
            setCreating(false)
            search.delete('new')
            setSearch(search, { replace: true })
          }}
          onCreated={(id) => {
            void navigate(`/app/lists/${id}`)
          }}
        />
      )}
    </>
  )
}
