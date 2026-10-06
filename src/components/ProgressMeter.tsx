import styles from './controls.module.css'
export function ProgressMeter({
  value,
  label = 'Progresso da lista',
}: {
  value: number | null
  label?: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((value ?? 0) * 100)}
      className={styles.progress}
    >
      <span style={{ transform: `scaleX(${String(value ?? 0)})` }} />
    </div>
  )
}
