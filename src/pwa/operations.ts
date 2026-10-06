let count = 0
let paused = false
export function pauseOperations(value: boolean) {
  paused = value
}
export function operationsPaused() {
  return paused
}
export function beginOperation() {
  count++
  let finished = false
  return () => {
    if (!finished) {
      finished = true
      count--
    }
  }
}
export function hasPendingOperations() {
  return count > 0
}
