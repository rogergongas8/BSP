/**
 * Maps the 4-digit PIN users type to the password stored in Supabase Auth.
 *
 * Supabase Auth rejects passwords shorter than 6 characters on user creation (the floor cannot be
 * lowered in project settings), so the raw PIN can no longer be the password. A fixed prefix adds
 * length without changing what users type; the PIN remains the only secret, and the per-account
 * login rate limit is what protects it.
 */
const PIN_PASSWORD_PREFIX = 'bsp-pin-'

export function pinToPassword(pin: string): string {
  return `${PIN_PASSWORD_PREFIX}${pin}`
}
