import { SHOP_CTA_LABEL_MAX_LENGTH } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ShopContactUpdate } from '#shared/schemas/shop'

/** Sugestões do botão: o lojista toca e, se quiser, ajusta o texto. */
export const CTA_LABEL_PRESETS = ['schedule', 'order', 'buy', 'talk'] as const

const BRAZIL_PREFIX = '55'
const BR_MOBILE_WITH_PREFIX_LENGTH = 13

/** Só os dígitos; aceita colar com `+55`, parênteses, espaço e hífen. */
export function whatsappDigits(input: string): string {
  const digits = input.replace(/\D/g, '')
  return digits.length === BR_MOBILE_WITH_PREFIX_LENGTH && digits.startsWith(BRAZIL_PREFIX) ? digits.slice(BRAZIL_PREFIX.length) : digits
}

/** "(67) 99123-4567" enquanto digita; o que passa de 11 dígitos é cortado. */
export function formatWhatsapp(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** `null` quando o número digitado não é um celular válido (vazio = sem WhatsApp, que é válido e vira `whatsapp: null`). */
export function toContactUpdate(whatsappInput: string, ctaLabelInput: string): ShopContactUpdate | null {
  const digits = whatsappDigits(whatsappInput)
  const label = ctaLabelInput.trim().slice(0, SHOP_CTA_LABEL_MAX_LENGTH)
  if (digits === '') return { whatsapp: null, ctaLabel: null }
  const whatsapp = PhoneNumberSchema.safeParse(digits)
  return whatsapp.success ? { whatsapp: whatsapp.data, ctaLabel: label === '' ? null : label } : null
}
