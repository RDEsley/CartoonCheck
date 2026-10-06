import { expect, it } from 'vitest'
import {
  canonicalRate,
  convertPrice,
  editPrice,
  formatPrice,
  parsePrice,
  parseRate,
} from './money'
import { parseLink } from './link'
import { InputError } from './input-error'
it('parses minor units exactly and distinguishes missing prices from zero', () => {
  expect(parsePrice('', 'BRL')).toBeNull()
  expect(parsePrice('0', 'BRL')).toBe(0)
  expect(parsePrice('12,34', 'BRL')).toBe(1234)
  expect(parsePrice('99999', 'JPY')).toBe(99999)
  expect(() => parsePrice('1.2', 'JPY')).toThrow()
  expect(() => parsePrice('1.001', 'USD')).toThrow()
  expect(() => parsePrice('1e3', 'EUR')).toThrow()
  expect(() => parsePrice('9007199254740992', 'JPY')).toThrow()
  expect(editPrice(5, 'BRL')).toBe('0,05')
  expect(editPrice(5, 'JPY')).toBe('5')
})
const problem = (run: () => unknown) => {
  try {
    run()
  } catch (error) {
    return error instanceof InputError ? error.problem : 'other'
  }
  return 'none'
}
it('names the problem with a rejected price, rate or link', () => {
  expect(problem(() => parsePrice('abc', 'BRL'))).toBe('price-format')
  expect(problem(() => parsePrice('1.000,00', 'BRL'))).toBe('price-format')
  expect(problem(() => parsePrice('1,234', 'BRL'))).toBe('price-decimals')
  expect(problem(() => parsePrice('12,5', 'JPY'))).toBe('price-decimals')
  expect(problem(() => parsePrice('9007199254740992', 'JPY'))).toBe(
    'price-range',
  )
  expect(parseRate(' 0,03500 ')).toBe('0.035')
  expect(parseRate('28.50')).toBe('28.5')
  for (const rate of ['', '0', '.5', '1.000,5', '1e3', '1000001', '0.000000001'])
    expect(problem(() => parseRate(rate))).toBe('rate')
  expect(parseLink('  ')).toBeNull()
  expect(parseLink(' https://example.com/switch ')).toBe(
    'https://example.com/switch',
  )
  for (const link of ['example.com', 'javascript:alert(1)', 'ftp://example.com'])
    expect(problem(() => parseLink(link))).toBe('link')
})
it('converts currencies with exact rational arithmetic and half-up rounding', () => {
  expect(convertPrice(1000, 'JPY', 'BRL', '0.035')).toBe(3500n)
  expect(convertPrice(1, 'JPY', 'BRL', '0.035')).toBe(4n)
  expect(convertPrice(100, 'BRL', 'JPY', '28.5')).toBe(29n)
  expect(canonicalRate('0,03500')).toBe('0.035')
  expect(formatPrice(9007199254740992n, 'BRL')).toContain(
    '90.071.992.547.409,92',
  )
})
