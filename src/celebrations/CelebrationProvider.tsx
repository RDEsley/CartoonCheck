import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useReducedMotion } from 'motion/react'
import { useRuntime } from '../app/context'
import { useFeedback } from '../app/feedback-context'
import { CelebrationContext } from './context'
import { celebrations as engine } from './engine'
import '../styles/celebrations.css'
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const { profile, db } = useRuntime()
  const { show } = useFeedback()
  const reduced = useReducedMotion() === true || profile?.reduceMotion === true
  const location = useLocation()
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
  return (
    <CelebrationContext.Provider
      value={{
        cancel: () => {
          engine.cancel()
        },
        purchase: (result, rect) => {
          if (!result.changed || result.item.status !== 'purchased') {
            engine.cancel()
            return
          }
          engine.purchase(
            result.item.name,
            rect,
            result.listCompleted,
            {
              reduced,
              haptics: profile?.hapticsEnabled ?? false,
              sakura: profile?.themeId === 'sakura',
            },
            () => {
              const generation = engine.generation
              void db.items
                .where('listId')
                .equals(result.item.listId)
                .filter((item) => item.status === 'pending')
                .count()
                .then(
                  (pending) => {
                    if (!pending && generation === engine.generation)
                      show('Lista completa! 🎉 Você conseguiu tudo.', {
                        kind: 'purchase',
                        result,
                      })
                    else engine.cancel()
                  },
                  () => {
                    engine.cancel()
                  },
                )
            },
          )
        },
      }}
    >
      {children}
    </CelebrationContext.Provider>
  )
}
