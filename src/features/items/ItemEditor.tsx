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
import { errorMessage } from '../../lib/error-message'
import { editPrice, parsePrice } from '../../lib/money'
import { parseLink } from '../../lib/link'
import { ItemLink } from './ItemDetails'
import { BlobImage, StoredImage } from '../../components/StoredImage'
import { celebrations } from '../../celebrations/engine'
import { useFormDraft } from '../../hooks/useFormDraft'
import { DiscardDialog } from '../../components/DiscardDialog'
import { DraftConflict } from '../../pwa/DraftConflict'
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
}: {
  item: ShoppingItem
  list: ShoppingList
  close: () => void
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
  const { pending, error, run, clearError } = useTask()
  const [invalid, setInvalid] = useState('')
  // The message leaves as soon as the rejected field is edited again.
  const edited = (field: string) => {
    if (invalid !== field) return
    setInvalid('')
    clearError()
  }
  // Marks and focuses the field whose value was rejected, so the message
  // below the form is tied to it.
  const read = <T,>(field: string, parse: () => T) => {
    try {
      return parse()
    } catch (reason) {
      setInvalid(field)
      document.getElementById(`item-${field}`)?.focus()
      throw reason
    }
  }
  const described = (field: string) =>
    invalid === field
      ? ({ 'aria-invalid': true, 'aria-describedby': 'item-error' } as const)
      : {}
  const [leaving, setLeaving] = useState(false)
  const { conflicted, dirty } = useFormDraft(
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
        if (open || pending || processing) return
        // A stale draft stays until the user decides what to do with it.
        if (conflicted) close()
        else if (dirty) setLeaving(true)
        else {
          discardDraft(scope)
          close()
        }
      }}
      title="Detalhes do item"
      description="Deixe do seu jeito."
    >
      {conflicted ? (
        <DraftConflict />
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            setInvalid('')
            void run(
              () =>
                updateItem(
                  db,
                  context,
                  item.id,
                  {
                    name,
                    quantity: Number(quantity),
                    plannedPriceMinor: read('planned', () =>
                      parsePrice(planned, currency),
                    ),
                    paidPriceMinor: read('paid', () =>
                      parsePrice(paid, currency),
                    ),
                    expectedCurrency: currency,
                    note: note || null,
                    store: store.trim() || null,
                    link: read('link', () => parseLink(link)),
                  },
                  item.revision,
                  photo,
                ),
              () => {
                discardDraft(scope)
                close()
                show('Item atualizado!')
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
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  // Clearing the field lets the same photo be chosen again later.
                  event.target.value = ''
                  if (!file || processing || pending) return
                  setProcessing(true)
                  setPhotoError('')
                  void compressImage(file)
                    .then(
                      async (asset) => {
                        await checkpointPhoto(scope, asset)
                        setPhoto(asset)
                      },
                      (reason: unknown) => {
                        setPhotoError(errorMessage(reason))
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
              id="item-planned"
              inputMode="decimal"
              maxLength={24}
              value={planned}
              onChange={(event) => {
                setPlanned(event.target.value)
                edited('planned')
              }}
              placeholder={currency === 'JPY' ? 'Ex.: 45000' : 'Ex.: 120,50'}
              {...described('planned')}
            />
          </label>
          <label>
            Preço pago ({currency})
            <input
              id="item-paid"
              inputMode="decimal"
              maxLength={24}
              value={paid}
              onChange={(event) => {
                setPaid(event.target.value)
                edited('paid')
              }}
              {...described('paid')}
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
              id="item-link"
              type="url"
              maxLength={2048}
              value={link}
              onChange={(event) => {
                setLink(event.target.value)
                edited('link')
              }}
              placeholder="https://…"
              {...described('link')}
            />
          </label>
          {item.link !== null && <ItemLink link={item.link} />}
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
            <p id="item-error" className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {leaving && (
        <DiscardDialog
          keep={() => {
            setLeaving(false)
          }}
          discard={() => {
            setLeaving(false)
            discardDraft(scope)
            close()
          }}
        />
      )}
    </BottomSheet>
  )
}
