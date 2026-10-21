import { HIT_ITEM_PRICE_MAX_CENTS } from '#shared/constants/domain'
import type { HitItemDraft, MerchantHitItem } from '#shared/schemas/hitItem'
import { formatCurrency } from '#shared/utils/currency'
import type { HitItemDraftResult, HitItemForm, HitItemFormErrorCode, HitItemPreview, HitItemRow, HitItemSaveError, HitItemSaveState } from '../types/hitItem'
import { emptyContactForm, formFromContact, isFormErrorCode, toContactPreview, toContactUpdate } from './shopContactForm'

export const HIT_ITEM_FORM_ERROR_CODES = ['missingTitle', 'invalidPrice', 'invalidEndsAt', 'missingPhoto'] as const

const CENTS_PER_REAL = 100
const END_OF_DAY = { hours: 23, minutes: 59, seconds: 59 } as const
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/

export function emptyHitItemForm(): HitItemForm {
  return { title: '', description: '', price: '', endsAt: '', useShopButton: true, contact: emptyContactForm('whatsapp') }
}

/** "12,50" → 1250. Vazio = sob consulta (`null`); texto que não é preço = `undefined`. */
export function parsePriceCents(input: string): number | null | undefined {
  const text = input.replace(/R\$|\s/g, '')
  if (text === '') return null
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text
  if (!PRICE_PATTERN.test(normalized)) return undefined
  const cents = Math.round(Number(normalized) * CENTS_PER_REAL)
  return cents > 0 && cents <= HIT_ITEM_PRICE_MAX_CENTS ? cents : undefined
}

function priceInput(cents: number | null): string {
  return cents === null ? '' : (cents / CENTS_PER_REAL).toFixed(2).replace('.', ',')
}

/** Dia local (AAAA-MM-DD) → o fim desse dia, que é quando o produto sai do ar. */
function endOfLocalDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (match === null) return null
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const end = new Date(year, month - 1, date, END_OF_DAY.hours, END_OF_DAY.minutes, END_OF_DAY.seconds)
  return end.getMonth() === month - 1 ? end : null
}

function localDay(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formFromItem(item: MerchantHitItem): HitItemForm {
  return {
    title: item.title,
    description: item.description ?? '',
    price: priceInput(item.priceCents),
    endsAt: item.endsAt === null ? '' : localDay(item.endsAt),
    useShopButton: item.contact === null,
    contact: formFromContact(item.contact),
  }
}

/** O que o formulário vira para enviar; `now` só serve para recusar uma data de fim que já passou. */
export function toHitItemDraft(form: HitItemForm, now: Date): HitItemDraftResult {
  const title = form.title.trim()
  if (title === '') return { ok: false, code: 'missingTitle' }
  const priceCents = parsePriceCents(form.price)
  if (priceCents === undefined) return { ok: false, code: 'invalidPrice' }
  const end = form.endsAt === '' ? null : endOfLocalDay(form.endsAt)
  if (form.endsAt !== '' && (end === null || end <= now)) return { ok: false, code: 'invalidEndsAt' }
  const contact = form.useShopButton ? { ok: true as const, update: { contact: null } } : toContactUpdate(form.contact)
  if (!contact.ok) return { ok: false, code: contact.code }
  const draft: HitItemDraft = {
    title,
    description: form.description.trim() === '' ? null : form.description.trim(),
    priceCents,
    contact: contact.update.contact,
    endsAt: end === null ? null : end.toISOString(),
  }
  return { ok: true, draft }
}

export function isHitItemFormErrorCode(code: string): code is HitItemFormErrorCode {
  return HIT_ITEM_FORM_ERROR_CODES.some((known) => known === code)
}

export function toHitItemRow(item: MerchantHitItem): HitItemRow {
  return {
    item,
    status: item.status,
    priceLabel: item.priceCents === null ? null : formatCurrency(item.priceCents),
    missingPhoto: item.photoUrl === null && item.status !== 'archived',
    rejectionReason: item.status === 'rejected' ? item.rejectionReason : null,
    canEdit: item.status !== 'archived',
  }
}

/** O card como o cliente vai ver, a partir do que está digitado (preço ainda inválido some, não quebra a prévia). */
export function toHitItemPreview(form: HitItemForm, photoUrl: string | null, whatsappDefaultLabel: string): HitItemPreview {
  const cents = parsePriceCents(form.price)
  return {
    title: form.title.trim(),
    description: form.description.trim() === '' ? null : form.description.trim(),
    priceLabel: typeof cents === 'number' ? formatCurrency(cents) : null,
    photoUrl,
    button: form.useShopButton ? null : toContactPreview(form.contact, whatsappDefaultLabel),
  }
}

/** O erro do último salvar: de campo (marca o campo) ou geral (vira uma frase ao lado do botão). */
export function saveErrorOf(state: HitItemSaveState): HitItemSaveError {
  if (state.status !== 'error') return { field: null, key: null }
  if (isHitItemFormErrorCode(state.code) || isFormErrorCode(state.code)) return { field: state.code, key: null }
  return { field: null, key: state.code === 'unreadable' ? 'merchantHits.errors.unreadable' : `errors.${state.code}` }
}
