import { expect, it } from 'vitest'
import {
  canonicalRate,
  convertPrice,
  editPrice,
  formatPrice,
  parsePrice,
} from './money'
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
it('converts currencies with exact rational arithmetic and half-up rounding', () => {
  expect(convertPrice(1000, 'JPY', 'BRL', '0.035')).toBe(3500n)
  expect(convertPrice(1, 'JPY', 'BRL', '0.035')).toBe(4n)
  expect(convertPrice(100, 'BRL', 'JPY', '28.5')).toBe(29n)
  expect(canonicalRate('0,03500')).toBe('0.035')
  expect(formatPrice(9007199254740992n, 'BRL')).toContain(
    '90.071.992.547.409,92',
  )
})
