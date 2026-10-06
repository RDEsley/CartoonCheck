import type { ComponentProps } from 'react'
import styles from './controls.module.css'
export function CartoonButton({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
}) {
  return (
    <button
      type="button"
      {...props}
      className={[styles.button, styles[variant], className].join(' ')}
    />
  )
}
