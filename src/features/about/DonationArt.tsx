import { useEffect, useRef } from 'react'

/** Set on the root by the runtime: the system preference or the profile's own switch. */
const reducedMotion = () =>
  document.documentElement.dataset.reducedMotion === 'true'

/** The waving character: an animated WebP, with a still frame for reduced motion. */
export function WaveArt({ className }: { className: string | undefined }) {
  return (
    <picture className={className}>
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet="/animations/donation-wave-still.webp"
      />
      <img
        src={
          reducedMotion()
            ? '/animations/donation-wave-still.webp'
            : '/animations/donation-wave.webp'
        }
        alt=""
        width={336}
        height={293}
      />
    </picture>
  )
}

/**
 * The donation jar (Lottie). The player and the file are only downloaded when
 * the art is on screen; if that fails the space stays empty and nothing else is
 * affected.
 */
export function JarArt({ className }: { className: string | undefined }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null
    Promise.all([
      import('lottie-web/build/player/lottie_light'),
      fetch('/animations/donation-jar.json').then((response) =>
        response.ok
          ? (response.json() as Promise<unknown>)
          : Promise.reject(new Error('animation')),
      ),
    ]).then(
      ([{ default: lottie }, animationData]) => {
        if (cancelled || container.current === null) return
        const item = lottie.loadAnimation({
          container: container.current,
          renderer: 'svg',
          loop: true,
          autoplay: !reducedMotion(),
          animationData,
        })
        destroy = () => {
          item.destroy()
        }
      },
      () => {
        // Decorative: the screen is complete without it.
      },
    )
    return () => {
      cancelled = true
      destroy?.()
    }
  }, [])
  return <div ref={container} className={className} aria-hidden="true" />
}
