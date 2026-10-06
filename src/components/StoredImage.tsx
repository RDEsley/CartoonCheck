import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '../app/context'
export function StoredImage({ id, size = 52 }: { id: string; size?: number }) {
  const { db } = useRuntime()
  const asset = useLiveQuery(() => db.assets.get(id), [db, id])
  return asset ? (
    <BlobImage blob={asset.blob} size={size} />
  ) : (
    <span style={{ width: size, height: size }} />
  )
}
export function BlobImage({ blob, size = 80 }: { blob: Blob; size?: number }) {
  return (
    <img
      alt=""
      width={size}
      height={size}
      style={{
        borderRadius: 12,
        objectFit: 'cover',
        border: '2px solid var(--ink)',
      }}
      ref={(element) => {
        if (element === null) return
        const url = URL.createObjectURL(blob)
        element.src = url
        return () => {
          URL.revokeObjectURL(url)
        }
      }}
    />
  )
}
