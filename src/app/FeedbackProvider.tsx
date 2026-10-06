import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { X, Undo2 } from 'lucide-react'
import { useRuntime } from './context'
import { FeedbackContext } from './feedback-context'
import type { Feedback } from './feedback-context'
import { useTask } from '../hooks/useTask'
import { undoItemAction } from '../features/items/undo'
import type { UndoAction } from '../features/items/undo'
import { CartoonButton } from '../components/CartoonButton'
import styles from './feedback.module.css'
import { celebrations } from '../celebrations/engine'
const repeatMarker = String.fromCharCode(0xa0)
// Reserves room below the page content so the bar never hides the last row.
function reserveSpace(element: HTMLElement | null) {
  if (element === null) return
  const root = document.documentElement
  const update = () => {
    root.style.setProperty(
      '--toast-space',
      `${String(element.offsetHeight + 16)}px`,
    )
  }
  update()
  const observer =
    typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
  observer?.observe(element)
  return () => {
    observer?.disconnect()
    root.style.removeProperty('--toast-space')
  }
}
interface Toast {
  message: string
  action?: UndoAction
  note?: string
}
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { db, context } = useRuntime()
  const [toast, setToast] = useState<Toast | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const { pending, error, run } = useTask()
  const announce = useCallback((message: string) => {
    // A repeated message still has to change the text to be read again.
    setAnnouncement((previous) =>
      previous === message ? message + repeatMarker : message,
    )
  }, [])
  const feedback = useMemo<Feedback>(
    () => ({
      show: (message, action) => {
        setToast((previous) =>
          action
            ? { message, action }
            : previous?.action
              ? { ...previous, note: message }
              : { message },
        )
        announce(message)
      },
      dismiss: () => {
        setToast(null)
      },
    }),
    [announce],
  )
  return (
    <FeedbackContext.Provider value={feedback}>
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {toast && (
        <aside
          ref={reserveSpace}
          className={styles.toast}
          aria-label="Última ação"
        >
          <p>{toast.message}</p>
          {toast.note && <p className={styles.note}>{toast.note}</p>}
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
                        announce('Desfeito. Tudo no lugar!')
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
