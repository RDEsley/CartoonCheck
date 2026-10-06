import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { useRuntime } from '../../app/context'
import { ProgressMeter } from '../../components/ProgressMeter'
import { getListSummary } from './queries'
import styles from '../../app/layout.module.css'
export function ListCard({ id }: { id: string }) {
  const { db } = useRuntime()
  const summary = useLiveQuery(() => getListSummary(db, id), [db, id])
  if (!summary) return null
  const { list, pendingCount, purchasedCount, progress } = summary
  return (
    <Link
      to={`/app/lists/${id}`}
      className={[styles.card, styles.listCard].join(' ')}
    >
      <span className={styles.listEmoji}>{list.emoji ?? '✦'}</span>
      <div>
        <h2>{list.name}</h2>
        <p className="muted">
          {pendingCount} para comprar · {purchasedCount} comprados
        </p>
        <ProgressMeter value={progress} label={`Progresso de ${list.name}`} />
      </div>
      <ArrowUpRight size={22} />
    </Link>
  )
}
