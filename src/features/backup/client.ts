import { z } from 'zod'
import { imageAssetSchema } from '../../db/models'
import { backupSchema, packBackup, validateBackup } from './format'
import type { BackupData } from './format'
import type { WorkerRequest } from './worker'
const threshold = 16 * 1024 * 1024
const replySchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('pack'), result: z.instanceof(Blob) }),
  z.strictObject({
    action: z.literal('read'),
    result: z.strictObject({
      metadata: backupSchema,
      assets: z.array(imageAssetSchema),
    }),
  }),
  z.strictObject({ action: z.literal('error') }),
])
function runWorker(request: WorkerRequest) {
  return new Promise<z.infer<typeof replySchema>>((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    const fail = () => {
      worker.terminate()
      reject(new Error('Backup processing failed.'))
    }
    worker.onerror = fail
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const reply = replySchema.safeParse(event.data)
      if (!reply.success || reply.data.action === 'error') {
        fail()
        return
      }
      worker.terminate()
      resolve(reply.data)
    }
    worker.postMessage(
      request,
      request.action === 'read' ? [request.buffer] : [],
    )
  })
}
export async function exportBackup(data: BackupData) {
  if (data.assets.reduce((sum, asset) => sum + asset.byteLength, 0) < threshold)
    return packBackup(data)
  const reply = await runWorker({ action: 'pack', data })
  if (reply.action !== 'pack') throw new Error('Unexpected backup response.')
  return reply.result
}
export async function readBackup(file: File) {
  const buffer = await file.arrayBuffer()
  if (file.size < threshold) return validateBackup(buffer)
  const reply = await runWorker({ action: 'read', buffer })
  if (reply.action !== 'read') throw new Error('Unexpected backup response.')
  return reply.result
}
export function downloadBackup(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cartoon-check-${new Date().toISOString().slice(0, 10)}.cartooncheck.zip`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
