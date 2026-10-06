import { isExchangeRate } from '../db/models'
import type { ShoppingList } from '../db/models'
import { InputError } from './input-error'
type Currency = ShoppingList['currency']
export function currencyDigits(currency: Currency) {
  return (
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  )
}
export function parsePrice(value: string, currency: Currency): number | null {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') return null
  const digits = currencyDigits(currency)
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new InputError('price-format')
  const [whole = '', fraction = ''] = normalized.split('.')
  if (fraction.length > digits) throw new InputError('price-decimals')
  const minor =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, '0') || '0')
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new InputError('price-range')
  return Number(minor)
}
export function editPrice(value: number | null, currency: Currency) {
  if (value === null) return ''
  const digits = currencyDigits(currency)
  const text = String(value).padStart(digits + 1, '0')
  return digits ? `${text.slice(0, -digits)},${text.slice(-digits)}` : text
}
export function formatPrice(value: number | bigint, currency: Currency) {
  const amount = BigInt(value)
  const factor = 10n ** BigInt(currencyDigits(currency))
  // Split integer and fraction so large totals never lose precision through Number.
  const parts = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).formatToParts(amount / factor)
  const fraction = String(amount % factor).padStart(
    currencyDigits(currency),
    '0',
  )
  return parts
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('')
}
export function convertPrice(
  value: number | bigint,
  from: Currency,
  to: Currency,
  rate: string,
): bigint {
  const [whole = '', fraction = ''] = rate.split('.')
  if (!/^\d+(?:\.\d+)?$/.test(rate)) throw new Error('Invalid exchange rate')
  const numerator = BigInt(whole + fraction) * 10n ** BigInt(currencyDigits(to))
  const denominator = 10n ** BigInt(fraction.length + currencyDigits(from))
  return (BigInt(value) * numerator + denominator / 2n) / denominator
}
export function canonicalRate(value: string) {
  return value
    .trim()
    .replace(',', '.')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}
/** The canonical form of a rate typed with a comma or a dot. */
export function parseRate(value: string): string {
  const rate = canonicalRate(value)
  if (!isExchangeRate(rate)) throw new InputError('rate')
  return rate
}
