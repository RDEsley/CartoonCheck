import { useState } from 'react'
import type { ReactNode } from 'react'
import { X, Undo2 } from 'lucide-react'
import { useRuntime } from './context'
import { FeedbackContext } from './feedback-context'
import { useTask } from '../hooks/useTask'
import { undoItemAction } from '../features/items/undo'
import type { UndoAction } from '../features/items/undo'
import { CartoonButton } from '../components/CartoonButton'
import styles from './feedback.module.css'
import { celebrations } from '../celebrations/engine'
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { db, context } = useRuntime()
  const [toast, setToast] = useState<{
    message: string
    action?: UndoAction
  } | null>(null)
  const { pending, error, run } = useTask()
  return (
    <FeedbackContext.Provider
      value={{
        show: (message, action) => {
          setToast((previous) =>
            action
              ? { message, action }
              : previous?.action
                ? previous
                : { message },
          )
        },
        dismiss: () => {
          setToast(null)
        },
      }}
    >
      {children}
      {toast && (
        <aside className={styles.toast} aria-label="Última ação">
          <p role="status">{toast.message}</p>
          <div className="row">
            {toast.action && (
              <CartoonButton
                variant="quiet"
                disabled={pending}
                onClick={() => {
                  const action = toast.action
                  if (action)
                    void run(
                      () => undoItemAction(db, context, action),
                      () => {
                        celebrations.cancel()
                        setToast((current) =>
                          current === toast
                            ? { message: 'Desfeito. Tudo no lugar!' }
                            : current,
                        )
                      },
                    )
                }}
              >
                <Undo2 size={18} />
                Desfazer
              </CartoonButton>
            )}
            <button
              className={styles.close}
              aria-label="Dispensar aviso"
              onClick={() => {
                setToast(null)
              }}
            >
              <X size={20} />
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </aside>
      )}
    </FeedbackContext.Provider>
  )
}
