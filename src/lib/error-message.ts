import { ZodError } from 'zod'
import { DataError } from '../db/errors'
import { InputError } from './input-error'
import type { InputProblem } from './input-error'
const inputMessages: Record<InputProblem, string> = {
  'image-format': 'Esta foto não é JPEG, PNG ou WebP. Escolha outro arquivo.',
  'image-size': 'Esta foto passa de 15 MB. Escolha um arquivo menor.',
  'image-pixels': 'Esta foto passa de 40 megapixels. Escolha uma imagem menor.',
  'image-decode': 'Não conseguimos abrir esta foto. Tente outro arquivo.',
  'image-fit':
    'Não foi possível reduzir esta foto o bastante. Tente outra imagem.',
  'price-format':
    'Use só números no preço, com vírgula ou ponto antes dos centavos.',
  'price-decimals':
    'Este preço tem casas decimais demais para a moeda da lista.',
  'price-range': 'Este preço é grande demais.',
  rate: 'Informe uma cotação maior que zero, com até 8 casas decimais e sem separador de milhares.',
  link: 'Use um link que comece com http:// ou https://.',
}
// Dexie reports a full disk as the cause of an aborted transaction.
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (/quota/i.test(error.name)) return true
  return 'inner' in error && error.inner !== error && isQuotaError(error.inner)
}
export function errorMessage(error: unknown): string {
  if (error instanceof InputError) return inputMessages[error.problem]
  if (isQuotaError(error))
    return 'O armazenamento está cheio. Exporte um backup e libere espaço antes de tentar de novo.'
  if (error instanceof DataError) {
    if (error.code === 'CONFLICT')
      return 'Os dados mudaram. Feche e abra este formulário para tentar de novo.'
    if (error.code === 'STALE_DATASET')
      return 'Um backup foi restaurado. Reabra o aplicativo antes de salvar.'
    if (error.code === 'CURRENCY_LOCKED')
      return 'Remova os preços dos itens antes de trocar a moeda.'
    if (error.code === 'ARCHIVED_LIST')
      return 'Reative esta lista antes de editar.'
    if (error.code === 'UNDO_UNAVAILABLE')
      return 'Não dá mais para desfazer: os dados mudaram depois desta ação.'
    return 'Não foi possível salvar. Seus dados anteriores foram preservados.'
  }
  if (error instanceof ZodError)
    return 'Revise os campos. Há um valor inválido ou fora do limite.'
  return 'Não foi possível concluir. Tente novamente; seus dados anteriores foram preservados.'
}
