import { describe, expect, it } from 'vitest'
import { ShopContactSchema, ShopContactUpdateSchema, ShopPublicContactSchema, ShopSummarySchema } from './shop'

const whatsapp = { kind: 'whatsapp', whatsapp: '67991234567', message: null, ctaLabel: null }
const url = { kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar agora' }

describe('ShopPublicContactSchema', () => {
  it('accepts both kinds', () => {
    expect(ShopPublicContactSchema.safeParse(whatsapp).success).toBe(true)
    expect(ShopPublicContactSchema.safeParse(url).success).toBe(true)
  })
  it('requires a label for the url kind', () => {
    expect(ShopPublicContactSchema.safeParse({ ...url, ctaLabel: null }).success).toBe(false)
  })
  it('refuses a stored url that is not public https', () => {
    expect(ShopPublicContactSchema.safeParse({ ...url, url: 'http://loja.com' }).success).toBe(false)
  })
  it('caps the whatsapp message', () => {
    expect(ShopPublicContactSchema.safeParse({ ...whatsapp, message: 'a'.repeat(301) }).success).toBe(false)
  })
})

describe('ShopSummarySchema', () => {
  const summary = {
    id: 'shop_a',
    name: 'Loja',
    category: 'bakery',
    neighborhood: 'Centro',
    addressLine: 'Rua A',
    program: { unit: 'stamp', target: 10, rewardTitle: 'Pão', earnRate: { per: 'visit', units: 1 }, welcomeUnits: 0 },
  }
  it('keeps a valid card button', () => {
    expect(ShopSummarySchema.parse({ ...summary, contact: url }).contact).toEqual(url)
  })
  it('drops only the button of a shop whose contact is not valid (old API shape), never the whole list', () => {
    const parsed = ShopSummarySchema.parse({ ...summary, contact: { whatsapp: '67991234567', ctaLabel: null } })
    expect(parsed.contact).toBeUndefined()
    expect(parsed.name).toBe('Loja')
  })
})

describe('ShopContactUpdateSchema', () => {
  it('adds https:// to a url typed without the scheme', () => {
    const parsed = ShopContactUpdateSchema.parse({ contact: { ...url, url: ' www.loja.com ' } })
    expect(parsed.contact).toMatchObject({ kind: 'url', url: 'https://www.loja.com/' })
  })
  it('stores the canonical form, so the database check never sees upper case or a missing slash pair', () => {
    const parsed = ShopContactUpdateSchema.parse({ contact: { ...url, url: 'HTTPS://Loja.com/x' } })
    expect(parsed.contact).toMatchObject({ url: 'https://loja.com/x' })
  })
  it.each(['javascript:alert(1)', 'http://loja.com', 'https://localhost', 'https://u:p@loja.com', 'https://10.0.0.1'])(
    'refuses %s',
    (bad) => {
      expect(ShopContactUpdateSchema.safeParse({ contact: { ...url, url: bad } }).success).toBe(false)
    },
  )
  it('accepts null to remove the button', () => {
    expect(ShopContactUpdateSchema.parse({ contact: null })).toEqual({ contact: null })
  })
  it('refuses fields of the other kind', () => {
    expect(ShopContactUpdateSchema.safeParse({ contact: { ...url, whatsapp: '67991234567' } }).success).toBe(false)
  })
})

describe('ShopContactSchema', () => {
  it('wraps the button or null, so the body is always an object', () => {
    expect(ShopContactSchema.parse({ contact: null })).toEqual({ contact: null })
    expect(ShopContactSchema.parse({ contact: url }).contact).toMatchObject({ kind: 'url' })
  })
})
