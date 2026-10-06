export const duration = {
  instant: 0,
  quick: 0.1,
  normal: 0.18,
  playful: 0.28,
  celebration: 0.9,
} as const
export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 },
  soft: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
  bouncy: { type: 'spring', stiffness: 380, damping: 20, mass: 0.8 },
  cartoon: { type: 'spring', stiffness: 450, damping: 22, mass: 0.7 },
} as const
