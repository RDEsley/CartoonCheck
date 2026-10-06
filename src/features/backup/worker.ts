import { packBackup, validateBackup } from './format'
import type { BackupData } from './format'
export type WorkerRequest =
  { action: 'pack'; data: BackupData } | { action: 'read'; buffer: ArrayBuffer }
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  const work =
    request.action === 'pack'
      ? packBackup(request.data)
      : validateBackup(request.buffer)
  void work.then(
    (result) => {
      self.postMessage({ action: request.action, result })
    },
    () => {
      self.postMessage({ action: 'error' })
    },
  )
}
