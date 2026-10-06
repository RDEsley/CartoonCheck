import type { ComponentProps } from 'react'
import styles from './controls.module.css'
export function CartoonButton({
  variant = 'primary',
  className = '',
  busy = false,
  children,
  onClick,
  ...props
}: ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  /** Blocks activation without removing the button from the focus order. */
  busy?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      aria-disabled={busy || undefined}
      onClick={(event) => {
        if (busy) event.preventDefault()
        else onClick?.(event)
      }}
      className={[styles.button, styles[variant], className].join(' ')}
    >
      {/* The face moves when pressed; the button itself keeps the hit target still. */}
      <span className={styles.face}>{children}</span>
    </button>
  )
}
