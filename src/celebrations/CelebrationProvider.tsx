import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useSystemReducedMotion } from '../hooks/useSystemReducedMotion'
import { useRuntime } from '../app/context'
import { useFeedback } from '../app/feedback-context'
import { getItemIds } from '../features/items/queries'
import { CelebrationContext } from './context'
import type { Celebrations } from './context'
import { celebrations as engine } from './engine'
import '../styles/celebrations.css'
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const { profile, db } = useRuntime()
  const { show } = useFeedback()
  const reduced = useSystemReducedMotion() || profile?.reduceMotion === true
  const location = useLocation()
  // The context value stays stable so item cards do not re-render with it.
  const latest = useRef({ db, show, reduced, profile })
  useEffect(() => {
    latest.current = { db, show, reduced, profile }
  })
  useEffect(() => {
    const cancel = () => {
      if (document.hidden) engine.cancel()
    }
    const resize = () => {
      engine.cancel()
    }
    document.addEventListener('visibilitychange', cancel)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('visibilitychange', cancel)
      window.removeEventListener('resize', resize)
      engine.cancel()
    }
  }, [])
  useEffect(
    () => () => {
      engine.cancel()
    },
    [location.pathname, reduced, profile?.themeId],
  )
  const value = useMemo<Celebrations>(
    () => ({
      cancel: () => {
        engine.cancel()
      },
      purchase: (result, rect) => {
        if (!result.changed || result.item.status !== 'purchased') {
          engine.cancel()
          return
        }
        const current = latest.current
        engine.purchase(
          result.item.name,
          rect,
          {
            reduced: current.reduced,
            haptics: current.profile?.hapticsEnabled ?? false,
            sakura: current.profile?.themeId === 'sakura',
          },
          result.listCompleted
            ? {
                confirm: async () =>
                  (
                    await getItemIds(
                      current.db,
                      result.item.listId,
                      'pending',
                    )
                  ).length === 0,
                celebrate: () => {
                  current.show('Lista completa! 🎉 Você conseguiu tudo.', {
                    kind: 'purchase',
                    result,
                  })
                },
              }
            : undefined,
        )
      },
    }),
    [],
  )
  return (
    <CelebrationContext.Provider value={value}>
      {children}
    </CelebrationContext.Provider>
  )
}
