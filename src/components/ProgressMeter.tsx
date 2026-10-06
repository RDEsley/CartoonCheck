import styles from './controls.module.css'
export function ProgressMeter({
  value,
  label = 'Progresso da lista',
}: {
  value: number | null
  label?: string
}) {
  const percent = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={
        value === null ? 'Lista vazia' : `${String(percent)}% comprado`
      }
      className={styles.progress}
    >
      <span style={{ transform: `scaleX(${String(percent / 100)})` }} />
    </div>
  )
}
