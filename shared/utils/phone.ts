import { MaskedPhoneSchema, PhoneNumberSchema } from '../schemas/phone'
import type { MaskedPhone, PhoneNumber } from '../schemas/phone'
import { err, ok } from '../types/result'
import type { Result } from '../types/result'
import type { ErrorOf } from '../types/errors'

const PHONE_DIGITS = 11
const COUNTRY_CODE = '55'
const DRAFT_TEMPLATE = '(__) _____-____'

export function phoneDigits(input: string): string {
  const digits = input.replace(/\D/g, '')
  const withoutCountry =
    digits.length === PHONE_DIGITS + COUNTRY_CODE.length && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits
  return withoutCountry.slice(0, PHONE_DIGITS)
}

export function parsePhoneNumber(input: string): Result<PhoneNumber, ErrorOf<'invalidPhone'>> {
  const parsed = PhoneNumberSchema.safeParse(phoneDigits(input))
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidPhone' })
}

/** `(67) 9••••-0374`: a única forma de celular permitida em listas. */
export function maskPhone(phone: PhoneNumber): MaskedPhone {
  return MaskedPhoneSchema.parse(`(${phone.slice(0, 2)}) 9••••-${phone.slice(-4)}`)
}

/** Preenche o visor do Balcão enquanto o lojista digita: `(67) 9____-____`. */
export function formatPhoneDraft(input: string): string {
  const digits = [...phoneDigits(input)]
  return DRAFT_TEMPLATE.replace(/_/g, (slot) => digits.shift() ?? slot)
}

/** Máscara progressiva do campo de celular: `(67) 99123-4567` conforme a pessoa digita. */
export function formatPhoneInput(input: string): string {
  const digits = phoneDigits(input)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  const area = digits.slice(0, 2)
  const head = digits.slice(2, 7)
  const tail = digits.slice(7)
  return tail.length === 0 ? `(${area}) ${head}` : `(${area}) ${head}-${tail}`
}
