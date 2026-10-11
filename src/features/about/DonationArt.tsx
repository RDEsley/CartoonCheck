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
 * A decorative Lottie. The player and the file are only downloaded when the art
 * is on screen; if that fails the space stays empty and nothing else is
 * affected. With `from` and `to` (composition frames) that stretch plays once
 * and stops at its end; without them the animation loops.
 */
function LottieArt({
  className,
  src,
  from,
  to,
}: {
  className: string | undefined
  src: string
  from?: number
  to?: number
}) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null
    Promise.all([
      import('lottie-web/build/player/lottie_light'),
      fetch(src).then((response) =>
        response.ok
          ? (response.json() as Promise<unknown>)
          : Promise.reject(new Error('animation')),
      ),
    ]).then(
      ([{ default: lottie }, animationData]) => {
        if (cancelled || container.current === null) return
        const once = from !== undefined && to !== undefined
        const item = lottie.loadAnimation({
          container: container.current,
          renderer: 'svg',
          loop: !once,
          autoplay: !once && !reducedMotion(),
          animationData,
        })
        if (once) {
          // Reduced motion goes straight to the last frame of the stretch.
          if (reducedMotion()) item.goToAndStop(to - from, true)
          else item.playSegments([from, to], true)
        }
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
  }, [src, from, to])
  return <div ref={container} className={className} aria-hidden="true" />
}

/** The donation jar, on the support screen. */
export function JarArt({ className }: { className: string | undefined }) {
  return <LottieArt className={className} src="/animations/donation-jar.json" />
}

/**
 * The thank-you heart, for whoever declines the invite. The flame turns into a
 * heart and it stays on screen: the file ends by shrinking the heart away, so
 * the stretch stops before that.
 */
export function HeartArt({ className }: { className: string | undefined }) {
  return (
    <LottieArt
      className={className}
      src="/animations/donation-heart.json"
      from={40}
      to={330}
    />
  )
}
