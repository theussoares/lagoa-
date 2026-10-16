import { SHOP_CTA_LABEL_MAX_LENGTH, SHOP_WHATSAPP_MESSAGE_MAX_LENGTH } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { type ShopPublicContact, ShopContactUpdateSchema } from '#shared/schemas/shop'
import { shopContactHref } from '#shared/utils/shopContactHref'
import type {
  ShopContactForm,
  ShopContactFormErrorCode,
  ShopContactKind,
  ShopContactPreview,
  ShopContactUpdateResult,
} from '../types/shopContact'

const BRAZIL_PREFIX = '55'
const BR_MOBILE_WITH_PREFIX_LENGTH = 13

/** Sugestões de texto do botão por modo: o lojista toca e, se quiser, ajusta. */
export function ctaLabelPresets(kind: ShopContactKind): readonly string[] {
  return kind === 'whatsapp' ? ['call', 'schedule', 'order', 'talk'] : ['buy', 'schedule', 'menu', 'order']
}

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

export function emptyContactForm(kind: ShopContactKind): ShopContactForm {
  return { kind, whatsapp: '', message: '', url: '', ctaLabel: '' }
}

export function formFromContact(contact: ShopPublicContact | null): ShopContactForm {
  if (contact === null) return emptyContactForm('whatsapp')
  if (contact.kind === 'url') return { ...emptyContactForm('url'), url: contact.url, ctaLabel: contact.ctaLabel }
  return {
    ...emptyContactForm('whatsapp'),
    whatsapp: formatWhatsapp(contact.whatsapp),
    message: contact.message ?? '',
    ctaLabel: contact.ctaLabel ?? '',
  }
}

/** O que o formulário vira para salvar; a URL passa pelo mesmo schema do BFF e da API. Texto e mensagem longos são cortados. */
export function toContactUpdate(form: ShopContactForm): ShopContactUpdateResult {
  const label = form.ctaLabel.trim().slice(0, SHOP_CTA_LABEL_MAX_LENGTH)
  if (form.kind === 'url') {
    const parsed = ShopContactUpdateSchema.safeParse({ contact: { kind: 'url', url: form.url, ctaLabel: label || 'x' } })
    if (!parsed.success) return { ok: false, code: 'invalidUrl' }
    if (label === '') return { ok: false, code: 'missingLabel' }
    return { ok: true, update: parsed.data }
  }
  const whatsapp = PhoneNumberSchema.safeParse(whatsappDigits(form.whatsapp))
  if (!whatsapp.success) return { ok: false, code: 'invalidWhatsapp' }
  const message = form.message.trim().slice(0, SHOP_WHATSAPP_MESSAGE_MAX_LENGTH)
  return {
    ok: true,
    update: { contact: { kind: 'whatsapp', whatsapp: whatsapp.data, message: message || null, ctaLabel: label || null } },
  }
}

/** O botão como vai aparecer; `null` enquanto o formulário ainda não dá para salvar. */
export function toContactPreview(form: ShopContactForm, whatsappDefaultLabel: string): ShopContactPreview | null {
  const result = toContactUpdate(form)
  if (!result.ok || result.update.contact === null) return null
  const { contact } = result.update
  return {
    label: contact.ctaLabel ?? whatsappDefaultLabel,
    icon: contact.kind === 'whatsapp' ? 'i-ph-whatsapp-logo' : 'i-ph-arrow-square-out',
    href: shopContactHref(contact),
  }
}

export function isFormErrorCode(code: string): code is ShopContactFormErrorCode {
  return code === 'invalidWhatsapp' || code === 'invalidUrl' || code === 'missingLabel'
}
