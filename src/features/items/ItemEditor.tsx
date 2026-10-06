import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRuntime } from '../../app/context'
import type { ImageAsset, ShoppingItem, ShoppingList } from '../../db/models'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { useTask } from '../../hooks/useTask'
import { deleteItem, updateItem } from './commands'
import { useFeedback } from '../../app/feedback-context'
import { compressImage } from './images'
import { editPrice, parsePrice } from '../../lib/money'
import { BlobImage, StoredImage } from '../../components/StoredImage'
import { celebrations } from '../../celebrations/engine'
export function ItemEditor({
  item,
  list,
  close,
  changed,
}: {
  item: ShoppingItem
  list: ShoppingList
  close: () => void
  changed: (notice: string) => void
}) {
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [planned, setPlanned] = useState(
    editPrice(item.plannedPriceMinor, list.currency),
  )
  const [paid, setPaid] = useState(
    editPrice(item.paidPriceMinor, list.currency),
  )
  const [note, setNote] = useState(item.note ?? '')
  const [store, setStore] = useState(item.store ?? '')
  const [link, setLink] = useState(item.link ?? '')
  const [photo, setPhoto] = useState<ImageAsset | null | undefined>(undefined)
  const [photoError, setPhotoError] = useState('')
  const [processing, setProcessing] = useState(false)
  const { pending, error, run } = useTask()
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
      title="Detalhes do item"
      description="Deixe do seu jeito."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          void run(
            () =>
              updateItem(
                db,
                context,
                item.id,
                {
                  name,
                  quantity: Number(quantity),
                  plannedPriceMinor: parsePrice(planned, list.currency),
                  paidPriceMinor: parsePrice(paid, list.currency),
                  expectedCurrency: list.currency,
                  note: note || null,
                  store: store.trim() || null,
                  link: link.trim() || null,
                },
                item.revision,
                photo,
              ),
            () => {
              close()
              changed('Item atualizado!')
            },
          )
        }}
      >
        <label>
          Nome
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            maxLength={120}
            required
          />
        </label>
        <div className="row">
          {photo ? (
            <BlobImage blob={photo.blob} />
          ) : photo === undefined && item.photoId ? (
            <StoredImage id={item.photoId} size={80} />
          ) : null}
          <label style={{ flex: 1 }}>
            Foto opcional
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={processing || pending}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setProcessing(true)
                setPhotoError('')
                void compressImage(file)
                  .then(setPhoto, () => {
                    setPhotoError(
                      'Escolha uma foto JPEG, PNG ou WebP de até 15 MB e 40 megapixels.',
                    )
                  })
                  .finally(() => {
                    setProcessing(false)
                  })
              }}
            />
          </label>
        </div>
        {(photo !== undefined && photo !== null || photo === undefined && item.photoId !== null) && (
          <CartoonButton
            variant="quiet"
            onClick={() => {
              setPhoto(null)
            }}
          >
            Remover foto
          </CartoonButton>
        )}
        {photoError && (
          <p className="error" role="alert">
            {photoError}
          </p>
        )}
        <label>
          Quantidade
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value)
            }}
            required
          />
        </label>
        <label>
          Preço planejado ({list.currency})
          <input
            inputMode="decimal"
            value={planned}
            onChange={(event) => {
              setPlanned(event.target.value)
            }}
            placeholder={list.currency === 'JPY' ? 'Ex.: 45000' : 'Ex.: 120,50'}
          />
        </label>
        <label>
          Preço pago ({list.currency})
          <input
            inputMode="decimal"
            value={paid}
            onChange={(event) => {
              setPaid(event.target.value)
            }}
          />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Preço total deste item, incluindo todas as unidades. Use vírgula ou
          ponto decimal, sem separador de milhares.
        </p>
        <label>
          Nota
          <textarea
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
            }}
          />
        </label>
        <label>
          Loja
          <input
            maxLength={120}
            value={store}
            onChange={(event) => {
              setStore(event.target.value)
            }}
          />
        </label>
        <label>
          Link
          <input
            type="url"
            maxLength={2048}
            value={link}
            onChange={(event) => {
              setLink(event.target.value)
            }}
            placeholder="https://…"
          />
        </label>
        <CartoonButton
          type="submit"
          disabled={pending || processing || !name.trim()}
        >
          Salvar item
        </CartoonButton>
        <CartoonButton
          variant="danger"
          disabled={pending || processing}
          onClick={() => {
            void run(
              () => deleteItem(db, context, item.id),
              (snapshot) => {
                celebrations.cancel()
                close()
                changed('Item removido.')
                show('Item removido.', { kind: 'delete', snapshot })
              },
            )
          }}
        >
          <Trash2 size={20} />
          Excluir item
        </CartoonButton>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
