import { describe, expect, it } from 'vitest'
import { ShopContactSchema, ShopContactUpdateSchema, ShopPublicContactSchema } from './shop'

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

describe('ShopContactUpdateSchema', () => {
  it('adds https:// to a url typed without the scheme', () => {
    const parsed = ShopContactUpdateSchema.parse({ contact: { ...url, url: ' www.loja.com ' } })
    expect(parsed.contact).toMatchObject({ kind: 'url', url: 'https://www.loja.com' })
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
