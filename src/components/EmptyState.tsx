import type { ReactNode } from 'react'
import { BrandArt } from './BrandArt'
import styles from './controls.module.css'
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className={styles.empty}>
      <BrandArt size={110} />
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {children}
    </div>
  )
}
