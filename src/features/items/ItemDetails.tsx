import { ArrowUpRight } from 'lucide-react'
import type { ShoppingItem, ShoppingList } from '../../db/models'
import { BottomSheet } from '../../components/BottomSheet'
import { StoredImage } from '../../components/StoredImage'
import { formatPrice } from '../../lib/money'
import styles from './items.module.css'
/** Opens a saved link in another tab, without giving that page access to this one. */
export function ItemLink({ link }: { link: string }) {
  let host = link
  try {
    host = new URL(link).host
  } catch {
    // Only valid links are stored; an unreadable one is shown as it is.
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
      style={{ gap: 6 }}
    >
      Abrir {host}
      <ArrowUpRight size={18} />
    </a>
  )
}
/** The details of an item in an archived list, which can be read but not edited. */
export function ItemDetails({
  item,
  currency,
  close,
}: {
  item: ShoppingItem
  currency: ShoppingList['currency']
  close: () => void
}) {
  return (
    <BottomSheet
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={item.name}
      description="Reative a lista para editar este item."
    >
      {item.photoId && <StoredImage id={item.photoId} size={160} />}
      <dl className={styles.details}>
        <div>
          <dt>Situação</dt>
          <dd>{item.status === 'purchased' ? 'Comprado' : 'Para comprar'}</dd>
        </div>
        <div>
          <dt>Quantidade</dt>
          <dd>{item.quantity}</dd>
        </div>
        {item.plannedPriceMinor !== null && (
          <div>
            <dt>Preço planejado</dt>
            <dd>{formatPrice(item.plannedPriceMinor, currency)}</dd>
          </div>
        )}
        {item.paidPriceMinor !== null && (
          <div>
            <dt>Preço pago</dt>
            <dd>{formatPrice(item.paidPriceMinor, currency)}</dd>
          </div>
        )}
        {item.store !== null && (
          <div>
            <dt>Loja</dt>
            <dd>{item.store}</dd>
          </div>
        )}
        {item.note !== null && (
          <div>
            <dt>Nota</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>{item.note}</dd>
          </div>
        )}
        {item.link !== null && (
          <div>
            <dt>Link</dt>
            <dd>
              <ItemLink link={item.link} />
            </dd>
          </div>
        )}
      </dl>
    </BottomSheet>
  )
}
