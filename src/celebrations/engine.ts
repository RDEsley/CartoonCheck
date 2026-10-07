import { duration } from '../animations/tokens'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  angle: number
  born: number
  life: number
  shape: 'strip' | 'circle' | 'star' | 'petal'
}
type Shape = Particle['shape']
export interface CelebrationOptions {
  reduced: boolean
  haptics: boolean
  shapes: readonly Shape[]
}
/** The particles each theme throws: petals for Sakura, stars for Space. */
export function themeShapes(theme: string | undefined): readonly Shape[] {
  if (theme === 'sakura') return ['petal']
  if (theme === 'space') return ['star']
  if (theme === 'night-cartoon') return ['star', 'circle']
  if (theme === 'candy') return ['circle', 'petal']
  if (theme === 'doodle') return ['strip', 'star']
  return ['strip', 'circle', 'star']
}
/** Present only when the purchase finished the list. */
export interface Completion {
  /** Re-reads the database: another change may have added a pending item. */
  confirm: () => Promise<boolean>
  celebrate: () => void
}
export class CelebrationEngine {
  generation = 0
  private canvas: HTMLCanvasElement | null = null
  private particles: Particle[] = []
  private frame = 0
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private ghosts = new Set<HTMLElement>()

  purchase(
    name: string,
    rect: DOMRect,
    options: CelebrationOptions,
    completion?: Completion,
  ) {
    // Haptics have their own preference; reducing motion does not silence them.
    if (options.haptics && typeof navigator.vibrate === 'function')
      navigator.vibrate(8)
    if (!options.reduced) this.ghost(name, rect)
    if (completion === undefined) {
      if (!options.reduced)
        this.later(() => {
          this.burst(
            rect.left + 34,
            rect.top + rect.height / 2,
            false,
            options.shapes,
          )
        }, 140)
      return
    }
    const finish = () => {
      const generation = this.generation
      void completion.confirm().then(
        (confirmed) => {
          // An undo, a new item or leaving the screen cancels the celebration.
          if (!confirmed || generation !== this.generation) return
          completion.celebrate()
          if (options.reduced) return
          // The final burst replaces the local bursts of recent purchases.
          this.particles = []
          this.burst(
            window.innerWidth / 2,
            Math.min(window.innerHeight / 3, 300),
            true,
            options.shapes,
          )
        },
        () => undefined,
      )
    }
    if (options.reduced) finish()
    else this.later(finish, 440)
  }
  cancel() {
    this.generation++
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    for (const ghost of this.ghosts) ghost.remove()
    this.ghosts.clear()
    cancelAnimationFrame(this.frame)
    this.frame = 0
    this.particles = []
    this.canvas?.remove()
    this.canvas = null
  }
  private later(callback: () => void, milliseconds: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      callback()
    }, milliseconds)
    this.timers.add(timer)
  }
  private ghost(name: string, rect: DOMRect) {
    const element = document.createElement('div')
    element.className = 'purchase-ghost'
    element.setAttribute('aria-hidden', 'true')
    element.inert = true
    Object.assign(element.style, {
      left: `${String(rect.left)}px`,
      top: `${String(rect.top)}px`,
      width: `${String(rect.width)}px`,
      height: `${String(rect.height)}px`,
    })
    const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    check.setAttribute('viewBox', '0 0 44 44')
    check.innerHTML =
      '<path d="M11 5c-7 1-8 6-7 17s3 17 16 18 18-3 19-16S36 3 25 4Z" fill="var(--success)" stroke="var(--ink)" stroke-width="2.5"/><path class="ghost-check" d="m12 22 7 7 14-15" pathLength="1" fill="none" stroke="var(--on-success)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    const text = document.createElement('span')
    text.textContent = name
    element.append(check, text)
    document.body.append(element)
    this.ghosts.add(element)
    element.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.025,.97)', opacity: 1, offset: 0.25 },
        { transform: 'translateY(-6px) scale(1.01)', opacity: 1, offset: 0.65 },
        { transform: 'translateX(12px)', opacity: 0 },
      ],
      { duration: duration.playful * 1000 + 80, easing: 'ease-out' },
    )
    this.later(() => {
      element.remove()
      this.ghosts.delete(element)
    }, 360)
  }
  private burst(
    x: number,
    y: number,
    complete: boolean,
    shapes: readonly Shape[],
  ) {
    const style = getComputedStyle(document.documentElement)
    const colors = ['--accent', '--secondary', '--success'].map((key) =>
      style.getPropertyValue(key).trim(),
    )
    const now = performance.now()
    const count = Math.min(complete ? 56 : 12, 72 - this.particles.length)
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2
      const speed =
        (complete ? 160 : 80) + Math.random() * (complete ? 220 : 100)
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color: colors[index % colors.length] ?? '#fcca54',
        size: 3 + Math.random() * 4,
        angle,
        born: now,
        life: complete ? 1200 : 650,
        shape: shapes[index % shapes.length] ?? 'strip',
      })
    }
    if (this.canvas === null) {
      this.canvas = document.createElement('canvas')
      this.canvas.className = 'celebration-canvas'
      this.canvas.setAttribute('aria-hidden', 'true')
      const dpr = Math.min(devicePixelRatio, 2)
      this.canvas.width = Math.round(innerWidth * dpr)
      this.canvas.height = Math.round(innerHeight * dpr)
      this.canvas.getContext('2d')?.scale(dpr, dpr)
      document.body.append(this.canvas)
    }
    if (!this.frame) this.draw(now)
  }
  private draw(previous: number) {
    this.frame = requestAnimationFrame((now) => {
      const canvas = this.canvas
      if (canvas === null) return
      const context = canvas.getContext('2d')
      if (context === null) {
        this.cancel()
        return
      }
      context.clearRect(0, 0, innerWidth, innerHeight)
      const delta = Math.min((now - previous) / 1000, 0.032)
      this.particles = this.particles.filter(
        (particle) => now - particle.born < particle.life,
      )
      for (const particle of this.particles) {
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.vy += 420 * delta
        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(particle.angle + (now - particle.born) / 350)
        context.globalAlpha = 1 - (now - particle.born) / particle.life
        context.fillStyle = particle.color
        if (particle.shape === 'strip')
          context.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size * 1.6,
          )
        else {
          context.beginPath()
          if (particle.shape === 'petal')
            context.ellipse(
              0,
              0,
              particle.size,
              particle.size * 0.55,
              0.4,
              0,
              Math.PI * 2,
            )
          else if (particle.shape === 'circle')
            context.arc(0, 0, particle.size * 0.6, 0, Math.PI * 2)
          else
            for (let point = 0; point < 10; point++) {
              const radius = particle.size * (point % 2 ? 0.45 : 1)
              const turn = (point * Math.PI) / 5
              context.lineTo(Math.sin(turn) * radius, -Math.cos(turn) * radius)
            }
          context.fill()
        }
        context.restore()
      }
      if (this.particles.length) this.draw(now)
      else {
        canvas.remove()
        this.canvas = null
        this.frame = 0
      }
    })
  }
}
export const celebrations = new CelebrationEngine()
