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
  dismissible = true,
  alert = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  dismissible?: boolean
  alert?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          role={alert ? 'alertdialog' : 'dialog'}
          onEscapeKeyDown={(event) => {
            if (!dismissible) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (!dismissible) event.preventDefault()
          }}
          className={styles.sheet}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById('page-title')?.focus()
          }}
        >
          <div className={styles.sheetHeading}>
            <Dialog.Title>{title}</Dialog.Title>
            {dismissible && (
              <Dialog.Close className={styles.iconButton} aria-label="Fechar">
                <X size={22} />
              </Dialog.Close>
            )}
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
