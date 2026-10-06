import styles from './controls.module.css'
export function CartoonCheckbox({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  checked: boolean
  label: string
  disabled?: boolean
  onChange: (viaKeyboard: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        // Keyboard and assistive activation dispatch a click without a pointer count.
        onChange(event.detail === 0)
      }}
      className={styles.checkbox}
    >
      <svg viewBox="0 0 44 44" width="40" height="40" aria-hidden="true">
        <path
          d="M11 5c-7 1-8 6-7 17s3 17 16 18 18-3 19-16S36 3 25 4Z"
          fill={checked ? 'var(--success)' : 'var(--surface)'}
          stroke="var(--ink)"
          strokeWidth="2.5"
        />
        <path
          d="m12 22 7 7 14-15"
          pathLength="1"
          fill="none"
          stroke="var(--on-success)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.checkStroke}
          style={{ strokeDashoffset: checked ? 0 : 1 }}
        />
      </svg>
    </button>
  )
}
