import { InputError } from './input-error'
/** A web address the app is willing to store and open, or null when empty. */
export function parseLink(value: string): string | null {
  const link = value.trim()
  if (link === '') return null
  let protocol: string
  try {
    protocol = new URL(link).protocol
  } catch {
    throw new InputError('link')
  }
  if (protocol !== 'http:' && protocol !== 'https:')
    throw new InputError('link')
  return link
}
