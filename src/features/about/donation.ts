import { buildPixCode } from './pix'

// A voluntary donation to the developer by Pix. The same settings are used in
// every project of the author; only the txid tells them apart on the statement.
export const donation = {
  pixKey: '35f6734f-2587-4139-8e9b-0ed7a4436a7a',
  /** The name people check in their bank app before confirming. */
  receiver: 'Richard Esley Silva Oliveira',
  /** The name inside the code: at most 25 characters, without accents. */
  receiverName: 'RICHARD ESLEY S OLIVEIRA',
  receiverCity: 'BRASILIA',
  txid: 'CARTOONCHECK',
  suggestedAmounts: [5, 10, 20],
  maxAmount: 5000,
} as const

/**
 * Reads a typed amount in reais. A comma or a dot is the decimal mark ("15,50"
 * or "15.50"); a thousands separator is rejected, so "1.500" is never read as a
 * different amount than the one that was meant.
 */
export function parseDonation(text: string) {
  const match = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(text.trim())
  if (match === null) return null
  const value = Number(`${match[1] ?? ''}.${match[2] ?? '0'}`)
  return value > 0 && value <= donation.maxAmount ? value : null
}

export function donationCode(amount: number | null) {
  return buildPixCode({
    key: donation.pixKey,
    receiverName: donation.receiverName,
    receiverCity: donation.receiverCity,
    txid: donation.txid,
    ...(amount === null ? {} : { amount }),
  })
}

export const formatDonation = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
