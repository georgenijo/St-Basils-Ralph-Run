/**
 * Parish contact details that must be verified before publication.
 *
 * Store phone numbers in E.164 format (for example, +15551234567). Keeping
 * this null ensures no unverified phone number is rendered anywhere.
 */
export const CHURCH_PHONE: string | null = null

export function formatChurchPhone(phone: string | null = CHURCH_PHONE): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  const usDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits

  if (usDigits.length !== 10) return phone

  return `(${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`
}

export function getChurchPhoneTelHref(phone: string | null = CHURCH_PHONE): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  const internationalDigits = digits.length === 10 ? `1${digits}` : digits
  return `tel:+${internationalDigits}`
}
