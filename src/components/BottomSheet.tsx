import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './controls.module.css'
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.sheet}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById('page-title')?.focus()
          }}
        >
          <div className={styles.sheetHeading}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className={styles.iconButton} aria-label="Fechar">
              <X size={22} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
