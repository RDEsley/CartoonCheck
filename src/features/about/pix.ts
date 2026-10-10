// Builds the static "Pix Copia e Cola" code: the Central Bank's BR Code, an EMV
// payload. It is only text made from the key, so nothing is sent anywhere and
// the app never learns whether somebody paid.
export interface PixRequest {
  key: string
  /** Up to 25 characters without accents. The bank shows the account's real name. */
  receiverName: string
  /** Up to 15 characters without accents. */
  receiverCity: string
  /** Shown on the receiver's statement: up to 25 letters or digits. */
  txid?: string
  /** In reais. Without it the payer types the amount in the bank app. */
  amount?: number
}

const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, '0')}${value}`

const plain = (text: string, maxLength: number) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, maxLength)

/** CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF), required by field 63. */
export function crc16(text: string) {
  let crc = 0xffff
  for (const char of text) {
    crc ^= char.charCodeAt(0) << 8
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function buildPixCode({
  key,
  receiverName,
  receiverCity,
  txid = '',
  amount,
}: PixRequest) {
  const priced = amount !== undefined && Number.isFinite(amount) && amount > 0
  const payload = [
    field('00', '01'),
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key.trim())),
    field('52', '0000'),
    field('53', '986'),
    priced ? field('54', amount.toFixed(2)) : '',
    field('58', 'BR'),
    field('59', plain(receiverName, 25)),
    field('60', plain(receiverCity, 15)),
    field(
      '62',
      field('05', txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'),
    ),
    '6304',
  ].join('')
  return payload + crc16(payload)
}
