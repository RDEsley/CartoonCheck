import { useLiveQuery } from 'dexie-react-hooks'
import { useRuntime } from '../../app/context'
import type { ShoppingList } from '../../db/models'
import { convertPrice, formatPrice } from '../../lib/money'
export function ListTotals({ list }: { list: ShoppingList }) {
  const { db } = useRuntime()
  const totals = useLiveQuery(async () => {
    const items = await db.items.where('listId').equals(list.id).toArray()
    const sum = {
      planned: 0n,
      spent: 0n,
      plannedCount: 0,
      paidCount: 0,
      purchasedCount: 0,
      itemCount: items.length,
      priced: false,
    }
    for (const item of items) {
      if (item.plannedPriceMinor !== null || item.paidPriceMinor !== null)
        sum.priced = true
      if (item.plannedPriceMinor !== null) {
        sum.planned += BigInt(item.plannedPriceMinor)
        sum.plannedCount++
      }
      if (item.status !== 'purchased') continue
      sum.purchasedCount++
      if (item.paidPriceMinor !== null) {
        sum.spent += BigInt(item.paidPriceMinor)
        sum.paidCount++
      }
    }
    return sum
  }, [db, list.id])
  if (!totals?.priced) return null
  // The totals only add the prices that were filled in, and say so when some are missing.
  const incomplete =
    totals.plannedCount < totals.itemCount ||
    totals.paidCount < totals.purchasedCount
  return (
    <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
      Pago: {formatPrice(totals.spent, list.currency)} · Planejado:{' '}
      {formatPrice(totals.planned, list.currency)}
      {incomplete && (
        <small style={{ display: 'block', marginTop: 6 }}>
          Só entram os preços informados: planejado em {totals.plannedCount} de{' '}
          {totals.itemCount} itens, pago em {totals.paidCount} de{' '}
          {totals.purchasedCount} comprados.
        </small>
      )}
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
          na sua cotação manual, valor aproximado.
        </small>
      )}
    </p>
  )
}
