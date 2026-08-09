export const AVATAR_IDS = [
  'default',
  ...Array.from({ length: 25 }, (_, i) => `profile-${i + 1}`),
] as const

export type AvatarId = typeof AVATAR_IDS[number]

export function isAvatarId(id: string): id is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(id)
}

export function avatarImagePath(id: AvatarId): string {
  const file = id === 'default' ? 'Default' : `Profile ${id.replace('profile-', '')}`
  return `/images/profilepictures/${file}.png`
}
