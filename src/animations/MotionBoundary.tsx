import { LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { useRuntime } from '../app/context'
const features = () =>
  import('./motion-features').then((module) => module.default)
/**
 * Enables animated components for the screens that use them. The animation
 * code stays out of the first load: elements render at once and start
 * animating when it arrives.
 */
export function MotionBoundary({ children }: { children: ReactNode }) {
  const { profile } = useRuntime()
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion={profile?.reduceMotion ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
