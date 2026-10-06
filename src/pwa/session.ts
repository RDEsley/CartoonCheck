const sessionName = 'cartoon-check:session'
let release: (() => void) | undefined
let heldRequest: Promise<void> | undefined
let acquisition: Promise<void> | undefined
function available() {
  return 'locks' in navigator
}
export async function acquireSession() {
  if (!available() || release) return
  acquisition ??= new Promise<void>((resolve, reject) => {
    heldRequest = navigator.locks
      .request(sessionName, { mode: 'shared' }, async () => {
        const held = new Promise<void>((done) => {
          release = done
        })
        resolve()
        await held
      })
      .catch(reject)
  })
  try {
    await acquisition
  } finally {
    acquisition = undefined
  }
}
export async function releaseSession() {
  const done = release
  release = undefined
  done?.()
  await heldRequest
  heldRequest = undefined
}
export async function initializeSession(
  initialize: (allowSchemaChange: boolean) => Promise<void>,
) {
  if (!available()) {
    await initialize(true)
    return
  }
  const initialized = await navigator.locks.request(
    sessionName,
    { mode: 'exclusive', ifAvailable: true },
    async (lock) => {
      if (lock === null) return false
      await initialize(true)
      return true
    },
  )
  await acquireSession()
  if (!initialized) await initialize(false)
}
export async function exclusiveUpdate(
  update: () => Promise<void>,
): Promise<boolean> {
  if (!available()) return false
  await releaseSession()
  let applied = false
  try {
    applied = await navigator.locks.request(
      sessionName,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (lock === null) return false
        await update()
        return true
      },
    )
  } finally {
    if (!applied) await acquireSession()
  }
  return applied
}
