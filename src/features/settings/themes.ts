import type { Profile } from '../../db/models'
import type { Avatar } from '../profile/avatars'
type Theme = Profile['themeId']
export const themeLabels: Record<Theme, string> = {
  'comic-pop': 'Comic Pop',
  sakura: 'Sakura',
  'night-cartoon': 'Night Cartoon',
  candy: 'Candy',
  doodle: 'Doodle',
  space: 'Space',
}
/** The sticker that represents each theme in its preview. */
export const themeArt: Record<Theme, Avatar> = {
  'comic-pop': 'star',
  sakura: 'flower',
  'night-cartoon': 'planet',
  candy: 'heart',
  doodle: 'cloud',
  space: 'rocket',
}
