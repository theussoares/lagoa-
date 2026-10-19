import { describe, expect, it } from 'vitest'
import type { MerchantHitItem } from '#shared/schemas/hitItem'
import { emptyHitItemForm, formFromItem, parsePriceCents, saveErrorOf, toHitItemDraft, toHitItemRow } from '../app/utils/hitItemForm'

const now = new Date(2026, 9, 19, 10, 0, 0)
const filled = { ...emptyHitItemForm(), title: '  Corte masculino ' }

const item: MerchantHitItem = {
  id: '0190b0c0-1111-7000-8000-000000000001',
  title: 'Corte',
  description: 'Na régua',
  priceCents: 4550,
  contact: { kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar agora' },
  endsAt: new Date(2026, 10, 30, 23, 59, 59).toISOString(),
  status: 'approved',
  rejectionReason: null,
  photoUrl: 'https://cdn.test/a.webp',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
}

describe('parsePriceCents', () => {
  it.each([
    ['12,50', 1250],
    ['R$ 1.250,00', 125000],
    ['12.5', 1250],
    ['7', 700],
    ['', null],
  ])('reads %j', (text, cents) => expect(parsePriceCents(text)).toBe(cents))

  it.each(['abc', '0', '-3', '1,234', '999999999'])('refuses %j', (text) => expect(parsePriceCents(text)).toBeUndefined())
})

describe('toHitItemDraft', () => {
  it('trims, turns blanks into null and uses the shop button by default', () => {
    expect(toHitItemDraft(filled, now)).toEqual({
      ok: true,
      draft: { title: 'Corte masculino', description: null, priceCents: null, contact: null, endsAt: null },
    })
  })

  it('ends the product at the end of the chosen local day, and refuses a day already gone', () => {
    const result = toHitItemDraft({ ...filled, endsAt: '2026-10-19' }, now)
    expect(result.ok && result.draft.endsAt).toBe(new Date(2026, 9, 19, 23, 59, 59).toISOString())
    expect(toHitItemDraft({ ...filled, endsAt: '2026-10-18' }, now)).toEqual({ ok: false, code: 'invalidEndsAt' })
    expect(toHitItemDraft({ ...filled, endsAt: '2026-02-31' }, now)).toEqual({ ok: false, code: 'invalidEndsAt' })
  })

  it('asks for the name and a valid price', () => {
    expect(toHitItemDraft({ ...filled, title: '   ' }, now)).toEqual({ ok: false, code: 'missingTitle' })
    expect(toHitItemDraft({ ...filled, price: 'muito' }, now)).toEqual({ ok: false, code: 'invalidPrice' })
  })

  it('validates the own button like the shop button screen does', () => {
    const own = { ...filled, useShopButton: false }
    expect(toHitItemDraft(own, now)).toEqual({ ok: false, code: 'invalidWhatsapp' })
    const withNumber = { ...own, contact: { ...own.contact, whatsapp: '(67) 99123-4567' } }
    expect(toHitItemDraft(withNumber, now)).toMatchObject({ ok: true, draft: { contact: { kind: 'whatsapp', whatsapp: '67991234567' } } })
  })
})

describe('formFromItem', () => {
  it('round-trips a saved item through the form', () => {
    const result = toHitItemDraft(formFromItem(item), new Date(2026, 9, 19))
    expect(result).toEqual({
      ok: true,
      draft: { title: 'Corte', description: 'Na régua', priceCents: 4550, contact: item.contact, endsAt: item.endsAt },
    })
  })

  it('marks an item without its own button as using the shop button', () => {
    expect(formFromItem({ ...item, contact: null }).useShopButton).toBe(true)
  })
})

describe('toHitItemRow', () => {
  it('shows the reason only on rejected items and flags a missing photo', () => {
    expect(toHitItemRow({ ...item, status: 'rejected', rejectionReason: 'Foto escura' }).rejectionReason).toBe('Foto escura')
    expect(toHitItemRow(item).rejectionReason).toBeNull()
    expect(toHitItemRow({ ...item, photoUrl: null }).missingPhoto).toBe(true)
    expect(toHitItemRow({ ...item, photoUrl: null, status: 'archived' })).toMatchObject({ missingPhoto: false, canEdit: false })
    expect(toHitItemRow(item).priceLabel).toMatch(/45,50/)
  })
})

describe('saveErrorOf', () => {
  it('splits field errors from general ones', () => {
    expect(saveErrorOf({ status: 'error', code: 'invalidPrice' })).toEqual({ field: 'invalidPrice', key: null })
    expect(saveErrorOf({ status: 'error', code: 'limitReached' })).toEqual({ field: null, key: 'errors.limitReached' })
    expect(saveErrorOf({ status: 'error', code: 'unreadable' })).toEqual({ field: null, key: 'merchantHits.errors.unreadable' })
    expect(saveErrorOf({ status: 'idle' })).toEqual({ field: null, key: null })
  })
})
