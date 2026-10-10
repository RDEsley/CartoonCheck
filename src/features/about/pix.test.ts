import { expect, it } from 'vitest'
import { buildPixCode, crc16 } from './pix'
import { donationCode, parseDonation } from './donation'

it('computes the checksum and reproduces the Central Bank example', () => {
  expect(crc16('123456789')).toBe('29B1')
  expect(
    buildPixCode({
      key: '123e4567-e12b-12d1-a456-426655440000',
      receiverName: 'Fulano de Tal',
      receiverCity: 'BRASILIA',
    }),
  ).toBe(
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
  )
})

it('builds the donation code with and without an amount', () => {
  expect(donationCode(null)).toBe(
    '00020126580014br.gov.bcb.pix013635f6734f-2587-4139-8e9b-0ed7a4436a7a5204000053039865802BR5924RICHARD ESLEY S OLIVEIRA6008BRASILIA62160512CARTOONCHECK6304C34B',
  )
  expect(donationCode(10)).toBe(
    '00020126580014br.gov.bcb.pix013635f6734f-2587-4139-8e9b-0ed7a4436a7a520400005303986540510.005802BR5924RICHARD ESLEY S OLIVEIRA6008BRASILIA62160512CARTOONCHECK630423A7',
  )
})

it('strips accents and symbols and limits the name, the city and the txid', () => {
  const code = buildPixCode({
    key: ' chave ',
    receiverName: 'José da Conceição Albuquerque Júnior',
    receiverCity: 'São José dos Campos',
    txid: 'meu app-2026!',
  })
  expect(code).toContain('0105chave')
  expect(code).toContain('5925Jose da Conceicao Albuque')
  expect(code).toContain('6015Sao Jose dos Ca')
  expect(code).toContain('0510meuapp2026')
  expect(crc16(code.slice(0, -4))).toBe(code.slice(-4))
})

it('reads typed amounts without ever taking a dot for thousands', () => {
  expect(parseDonation('15,50')).toBe(15.5)
  expect(parseDonation('15.50')).toBe(15.5)
  expect(parseDonation(' 7 ')).toBe(7)
  expect(parseDonation('5000')).toBe(5000)
  for (const text of [
    '1.500',
    '1,500',
    'abc',
    '',
    '0',
    '0,00',
    '5000,01',
    '-5',
  ])
    expect(parseDonation(text)).toBeNull()
})
