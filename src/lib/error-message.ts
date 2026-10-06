import { ZodError } from 'zod'
import { DataError } from '../db/errors'
export function errorMessage(error: unknown): string {
  if (error instanceof DataError) {
    if (error.code === 'CONFLICT')
      return 'Os dados mudaram. Feche e abra este formulário para tentar de novo.'
    if (error.code === 'STALE_DATASET')
      return 'Um backup foi restaurado. Reabra o aplicativo antes de salvar.'
    if (error.code === 'CURRENCY_LOCKED')
      return 'Remova os preços dos itens antes de trocar a moeda.'
    if (error.code === 'ARCHIVED_LIST')
      return 'Reative esta lista antes de editar.'
    return 'Não foi possível salvar. Seus dados anteriores foram preservados.'
  }
  if (error instanceof ZodError)
    return 'Revise os campos. Há um valor inválido ou fora do limite.'
  if (error instanceof Error && /quota/i.test(error.name))
    return 'O armazenamento está cheio. Exporte um backup e libere espaço antes de tentar de novo.'
  return 'Não foi possível concluir. Tente novamente; seus dados anteriores foram preservados.'
}
