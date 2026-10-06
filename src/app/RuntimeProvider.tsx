import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MotionConfig } from 'motion/react'
import type { CommandContext } from '../db/context'
import { database, initializeRuntime, subscribeDatabase } from './runtime'
import { RuntimeContext } from './context'
import { Wordmark } from '../components/BrandArt'
import { CartoonButton } from '../components/CartoonButton'

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<CommandContext | null>(null)
  const [failed, setFailed] = useState(false)
  const state = useSyncExternalStore(subscribeDatabase, () => database.state)
  useEffect(() => {
    let active = true
    void initializeRuntime().then(
      (value) => {
        if (active) setContext(value)
      },
      () => {
        if (active) setFailed(true)
      },
    )
    return () => {
      active = false
    }
  }, [])
  if (failed || state === 'outdated' || state === 'blocked')
    return (
      <main className="recovery">
        <Wordmark />
        <h1>Seus dados precisam de cuidado.</h1>
        <p>
          {state === 'blocked'
            ? 'Feche outras abas do Cartoon Check e tente novamente.'
            : 'Reabra o aplicativo atualizado. Nenhum dado foi apagado.'}
        </p>
        <CartoonButton
          onClick={() => {
            location.reload()
          }}
        >
          Reabrir
        </CartoonButton>
      </main>
    )
  if (context === null)
    return (
      <main className="recovery" role="status">
        <Wordmark />
        <p>Abrindo suas listas…</p>
      </main>
    )
  return <ReadyRuntime context={context}>{children}</ReadyRuntime>
}
function ReadyRuntime({
  context,
  children,
}: {
  context: CommandContext
  children: ReactNode
}) {
  const profiles = useLiveQuery(() => database.profile.toArray(), [])
  const meta = useLiveQuery(() => database.meta.get('app'), [])
  const profile = profiles?.[0] ?? null
  useEffect(() => {
    document.documentElement.dataset.theme = profile?.themeId ?? 'comic-pop'
    document.documentElement.dataset.reducedMotion = String(
      profile?.reduceMotion ?? false,
    )
  }, [profile?.themeId, profile?.reduceMotion])
  if (profiles === undefined)
    return (
      <main className="recovery" role="status">
        Abrindo seu perfil…
      </main>
    )
  if (meta && meta.datasetEpoch !== context.datasetEpoch)
    return (
      <main className="recovery">
        <h1>Um backup foi restaurado.</h1>
        <p>Reabra o aplicativo para continuar com os dados restaurados.</p>
        <CartoonButton
          onClick={() => {
            location.reload()
          }}
        >
          Reabrir
        </CartoonButton>
      </main>
    )
  return (
    <RuntimeContext.Provider value={{ db: database, context, profile }}>
      <MotionConfig reducedMotion={profile?.reduceMotion ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    </RuntimeContext.Provider>
  )
}
