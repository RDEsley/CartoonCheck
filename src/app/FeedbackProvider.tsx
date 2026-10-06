import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { X, Undo2 } from 'lucide-react'
import { useRuntime } from './context'
import { FeedbackContext } from './feedback-context'
import type { Feedback, FeedbackAction } from './feedback-context'
import type { Runtime } from './context'
import { useTask } from '../hooks/useTask'
import { undoItemAction } from '../features/items/undo'
import { undoArchiveChange } from '../features/lists/commands'
import { DataError } from '../db/errors'
import { CartoonButton } from '../components/CartoonButton'
import styles from './feedback.module.css'
import { celebrations } from '../celebrations/engine'
const repeatMarker = String.fromCharCode(0xa0)
// A confirmation leaves on its own; a bar that offers undo stays until dismissed.
const confirmationTime = 8000
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
async function undo(
  { db, context }: Pick<Runtime, 'db' | 'context'>,
  action: FeedbackAction,
) {
  try {
    if (action.kind === 'archive')
      await undoArchiveChange(db, context, action.list)
    else await undoItemAction(db, context, action)
  } catch (error) {
    // The data moved on after the action, so this token can no longer apply.
    if (
      error instanceof DataError &&
      (error.code === 'CONFLICT' || error.code === 'NOT_FOUND')
    )
      throw new DataError('UNDO_UNAVAILABLE', error.message)
    throw error
  }
}
// The Undo button disappears once used, so focus moves to the restored item
// when it is on screen, or to the page title. A pointer never scrolls the page.
function focusAfterUndo(action: FeedbackAction, viaKeyboard: boolean) {
  const expected =
    action.kind === 'delete'
      ? action.snapshot.item
      : action.kind === 'purchase'
        ? {
            id: action.result.item.id,
            status: action.result.previousPurchase.status,
          }
        : null
  const selector =
    expected === null
      ? null
      : `[data-item-id="${expected.id}"][data-purchased="${String(expected.status === 'purchased')}"] [role="checkbox"]`
  let frames = 0
  const attempt = () => {
    const restored =
      selector === null ? null : document.querySelector<HTMLElement>(selector)
    if (restored !== null) restored.focus({ preventScroll: !viaKeyboard })
    else if (selector === null || frames++ >= 20)
      document
        .getElementById('page-title')
        ?.focus({ preventScroll: !viaKeyboard })
    else requestAnimationFrame(attempt)
  }
  requestAnimationFrame(attempt)
}
interface Toast {
  message: string
  action?: FeedbackAction
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
  useEffect(() => {
    if (toast === null || (toast.action && !toast.note)) return
    const timer = setTimeout(() => {
      setToast((current) =>
        current !== toast
          ? current
          : toast.action
            ? { message: toast.message, action: toast.action }
            : null,
      )
    }, confirmationTime)
    return () => {
      clearTimeout(timer)
    }
  }, [toast])
  return (
    <FeedbackContext.Provider value={feedback}>
      {children}
      {/* The explicit aria-live keeps this region exposed while a sheet is open. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {toast && (
        <aside
          ref={reserveSpace}
          className={styles.toast}
          aria-label="Última ação"
        >
          <div className={styles.text}>
            <p>{toast.message}</p>
            {toast.note && <p className={styles.note}>{toast.note}</p>}
          </div>
          <div className={styles.actions}>
            {toast.action && (
              <CartoonButton
                variant="quiet"
                disabled={pending}
                onClick={(event) => {
                  const action = toast.action
                  const viaKeyboard = event.detail === 0
                  // A pending completion must not fire while the purchase is undone.
                  celebrations.cancel()
                  if (action)
                    void run(
                      () => undo({ db, context }, action),
                      () => {
                        celebrations.cancel()
                        setToast((current) =>
                          current === toast
                            ? { message: 'Desfeito. Tudo no lugar!' }
                            : current,
                        )
                        announce('Desfeito. Tudo no lugar!')
                        focusAfterUndo(action, viaKeyboard)
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
            <p className={['error', styles.problem].join(' ')} role="alert">
              {error}
            </p>
          )}
        </aside>
      )}
    </FeedbackContext.Provider>
  )
}
