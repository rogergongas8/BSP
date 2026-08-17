/**
 * Username rules for the PIN-based auth used across the app.
 *
 * The internal Supabase Auth email is derived from the username (`{slug}@bsp.internal`), which
 * only tolerates a narrow character set. The first version simply banned anything outside
 * `[a-z0-9_]`, so professors called "José" or "Muñoz" were told their name was invalid — the
 * accent, not the name, was the problem.
 *
 * Accented Latin letters are now accepted for what the user types and stored as their display
 * name; the email address is built from a transliterated slug instead. `josé` and `jose` therefore
 * collide by design: two accounts differing only by an accent on a shared class projector would be
 * a worse problem than the collision.
 */

/** Latin letters (incl. accented), digits, underscore, hyphen and spaces. */
const USERNAME_PATTERN = /^[\p{L}\p{N}_\- ]+$/u

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 30

/**
 * Strips diacritics and maps anything still unsafe to `_`, yielding the local part of the
 * internal email. NFD splits an accented character into base letter + combining mark, so the
 * mark range can be removed and the plain letter kept.
 */
export function usernameToSlug(username: string): string {
  return username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export type UsernameProblem = 'too_short' | 'too_long' | 'invalid_chars' | 'unusable'

/** Validates a raw username, returning the problem to report or null when it is acceptable. */
export function validateUsername(raw: string): UsernameProblem | null {
  const trimmed = raw.trim()
  if (trimmed.length < USERNAME_MIN_LENGTH) return 'too_short'
  if (trimmed.length > USERNAME_MAX_LENGTH) return 'too_long'
  if (!USERNAME_PATTERN.test(trimmed)) return 'invalid_chars'
  // Something like "---" passes the pattern but leaves nothing to build an address from.
  if (usernameToSlug(trimmed).length < USERNAME_MIN_LENGTH) return 'unusable'
  return null
}

/** User-facing copy for each problem. Kept here so signup and login cannot drift apart. */
export const USERNAME_PROBLEM_MESSAGE: Record<UsernameProblem, string> = {
  too_short: `Your name needs at least ${USERNAME_MIN_LENGTH} characters.`,
  too_long: `Your name can be at most ${USERNAME_MAX_LENGTH} characters.`,
  invalid_chars: 'Only letters, numbers, spaces, hyphens and underscores are allowed.',
  unusable: 'Please include at least a few letters or numbers.',
}
