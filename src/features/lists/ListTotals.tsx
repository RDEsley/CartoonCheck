import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '../../app/context'
import type { ShoppingList } from '../../db/models'
import { convertPrice, formatPrice } from '../../lib/money'
export function ListTotals({ list }: { list: ShoppingList }) {
  const { db } = useRuntime()
  const totals = useLiveQuery(async () => {
    const items = await db.items.where('listId').equals(list.id).toArray()
    const priced = items.some(
      (item) => item.paidPriceMinor !== null || item.plannedPriceMinor !== null,
    )
    return {
      priced,
      planned: items.reduce(
        (sum, item) => sum + BigInt(item.plannedPriceMinor ?? 0),
        0n,
      ),
      spent: items.reduce(
        (sum, item) =>
          sum +
          (item.status === 'purchased' ? BigInt(item.paidPriceMinor ?? 0) : 0n),
        0n,
      ),
    }
  }, [db, list.id])
  if (!totals?.priced) return null
  return (
    <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
      Pago: {formatPrice(totals.spent, list.currency)} · Planejado:{' '}
      {formatPrice(totals.planned, list.currency)}
      {list.secondaryCurrency && list.manualExchangeRate && (
        <small style={{ display: 'block', marginTop: 6 }}>
          Pago ≈{' '}
          {formatPrice(
            convertPrice(
              totals.spent,
              list.currency,
              list.secondaryCurrency,
              list.manualExchangeRate,
            ),
            list.secondaryCurrency,
          )}{' '}
          na sua cotação manual. Totais incluem só os preços preenchidos.
        </small>
      )}
    </p>
  )
}
