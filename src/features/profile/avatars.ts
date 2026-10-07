import type { Profile } from '../../db/models'
export type Avatar = NonNullable<Profile['avatarPresetId']>
export const avatarLabels: Record<Avatar, string> = {
  bag: 'Sacola',
  star: 'Estrela',
  gift: 'Presente',
  leaf: 'Folha',
  planet: 'Planeta',
  heart: 'Coração',
  flower: 'Flor',
  rocket: 'Foguete',
  cloud: 'Nuvem',
}
