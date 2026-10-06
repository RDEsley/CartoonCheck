export type InputProblem =
  | 'image-format'
  | 'image-size'
  | 'image-pixels'
  | 'image-decode'
  | 'image-fit'
  | 'price-format'
  | 'price-decimals'
  | 'price-range'
  | 'rate'
  | 'link'
/**
 * Something the user typed or chose cannot be used. The problem selects the
 * message shown, so the reason reaches the user instead of a generic failure.
 */
export class InputError extends Error {
  constructor(readonly problem: InputProblem) {
    super(`Invalid input: ${problem}`)
    this.name = 'InputError'
  }
}
