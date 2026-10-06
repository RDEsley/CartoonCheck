import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '../../app/context'
import { BrandArt } from '../../components/BrandArt'
import { EmptyState } from '../../components/EmptyState'
import { ListCard } from './ListCard'
import { getListIds } from './queries'
import styles from '../../app/layout.module.css'
export function Home({ archived = false }: { archived?: boolean }) {
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
          <h1 id="page-title" tabIndex={-1}>
            {archived ? 'Listas arquivadas' : `Olá, ${profile?.name ?? ''} 👋`}
          </h1>
          <p className="muted">
            {archived
              ? 'Reabra uma lista quando quiser.'
              : 'O que vamos comprar hoje?'}
          </p>
        </div>
        <BrandArt kind={profile?.avatarPresetId ?? 'bag'} size={72} />
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
    </>
  )
}
