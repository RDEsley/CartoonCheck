export type DataErrorCode =
  | 'DATABASE_UNAVAILABLE'
  | 'INVALID_DATABASE'
  | 'STALE_DATASET'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ARCHIVED_LIST'
  | 'PROFILE_EXISTS'
  | 'PROFILE_REQUIRED'
  | 'CURRENCY_LOCKED'

export class DataError extends Error {
  constructor(
    readonly code: DataErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CartoonCheckDataError'
  }
}
