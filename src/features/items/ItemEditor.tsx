import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRuntime } from '../../app/context'
import type { ImageAsset, ShoppingItem, ShoppingList } from '../../db/models'
import { currencies } from '../../db/models'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import { useTask } from '../../hooks/useTask'
import { deleteItem, updateItem } from './commands'
import { useFeedback } from '../../app/feedback-context'
import { compressImage } from './images'
import { editPrice, parsePrice } from '../../lib/money'
import { BlobImage, StoredImage } from '../../components/StoredImage'
import { celebrations } from '../../celebrations/engine'
import { useFormDraft } from '../../hooks/useFormDraft'
import {
  checkpointPhoto,
  discardDraft,
  initialDraftField,
  initialDraftPhoto,
} from '../../pwa/drafts'
export function ItemEditor({
  item: sourceItem,
  list: sourceList,
  close,
  changed,
}: {
  item: ShoppingItem
  list: ShoppingList
  close: () => void
  changed: (notice: string) => void
}) {
  const [item] = useState(sourceItem)
  const [list] = useState(sourceList)
  const { db, context } = useRuntime()
  const { show } = useFeedback()
  const scope = `item:${item.id}`
  const initial = (field: string, fallback: string) =>
    initialDraftField(
      scope,
      context.datasetEpoch,
      item.revision,
      field,
      fallback,
    )
  const [name, setName] = useState(() => initial('name', item.name))
  const [quantity, setQuantity] = useState(() =>
    initial('quantity', String(item.quantity)),
  )
  const [currency] = useState(
    () =>
      currencies.find(
        (value) => value === initial('currency', list.currency),
      ) ?? list.currency,
  )
  const [planned, setPlanned] = useState(() =>
    initial('planned', editPrice(item.plannedPriceMinor, currency)),
  )
  const [paid, setPaid] = useState(() =>
    initial('paid', editPrice(item.paidPriceMinor, currency)),
  )
  const [note, setNote] = useState(() => initial('note', item.note ?? ''))
  const [store, setStore] = useState(() => initial('store', item.store ?? ''))
  const [link, setLink] = useState(() => initial('link', item.link ?? ''))
  const [photo, setPhoto] = useState<ImageAsset | null | undefined>(() =>
    initialDraftPhoto(scope, context.datasetEpoch, item.revision),
  )
  const [photoError, setPhotoError] = useState('')
  const [processing, setProcessing] = useState(false)
  const { pending, error, run } = useTask()
  const draftConflict = useFormDraft(
    scope,
    item.revision,
    `/app/lists/${list.id}?itemEdit=${item.id}`,
    {
      name,
      quantity,
      planned,
      paid,
      note,
      store,
      link,
      photo:
        photo === undefined ? 'keep' : photo === null ? 'remove' : 'replace',
      currency,
    },
    {
      name: item.name,
      quantity: String(item.quantity),
      planned: editPrice(item.plannedPriceMinor, list.currency),
      paid: editPrice(item.paidPriceMinor, list.currency),
      note: item.note ?? '',
      store: item.store ?? '',
      link: item.link ?? '',
      photo: 'keep',
      currency: list.currency,
    },
  )
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open && !pending && !processing) {
          discardDraft(scope)
          close()
        }
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
                  plannedPriceMinor: parsePrice(planned, currency),
                  paidPriceMinor: parsePrice(paid, currency),
                  expectedCurrency: currency,
                  note: note || null,
                  store: store.trim() || null,
                  link: link.trim() || null,
                },
                item.revision,
                photo,
              ),
            () => {
              discardDraft(scope)
              close()
              changed('Item atualizado!')
            },
          )
        }}
      >
        <label>
          Nome
          <input
            data-autofocus
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
                  .then(
                    async (asset) => {
                      await checkpointPhoto(scope, asset)
                      setPhoto(asset)
                    },
                    () => {
                      setPhotoError(
                        'Escolha uma foto JPEG, PNG ou WebP de até 15 MB e 40 megapixels.',
                      )
                    },
                  )
                  .finally(() => {
                    setProcessing(false)
                  })
              }}
            />
          </label>
        </div>
        {((photo !== undefined && photo !== null) ||
          (photo === undefined && item.photoId !== null)) && (
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
          Preço planejado ({currency})
          <input
            inputMode="decimal"
            value={planned}
            onChange={(event) => {
              setPlanned(event.target.value)
            }}
            placeholder={currency === 'JPY' ? 'Ex.: 45000' : 'Ex.: 120,50'}
          />
        </label>
        <label>
          Preço pago ({currency})
          <input
            inputMode="decimal"
            value={paid}
            onChange={(event) => {
              setPaid(event.target.value)
            }}
          />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
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
          disabled={pending || processing || draftConflict || !name.trim()}
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
                discardDraft(scope)
                celebrations.cancel()
                close()
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
        {draftConflict && (
          <p className="error" role="alert">
            Os dados mudaram desde o rascunho. Guarde uma cópia do rascunho,
            feche esta edição e abra o item de novo.
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
