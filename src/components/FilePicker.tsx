import type { ReactNode } from 'react'
import styles from './controls.module.css'
/**
 * A file field drawn as one of the app's buttons. The native control shows its
 * text in the language of the browser and cannot be themed, so it is kept for
 * the keyboard and assistive technology only.
 */
export function FilePicker({
  label,
  accept,
  children,
  onPick,
}: {
  /** The accessible name of the field. */
  label: string
  accept: string
  children: ReactNode
  onPick: (file: File) => void
}) {
  return (
    <label className={[styles.button, styles.quiet, styles.picker].join(' ')}>
      <input
        type="file"
        className="sr-only"
        aria-label={label}
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Clearing the field lets the same file be chosen again later.
          event.target.value = ''
          if (file) onPick(file)
        }}
      />
      <span className={styles.face}>{children}</span>
    </label>
  )
}
