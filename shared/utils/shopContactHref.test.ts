import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '../schemas/phone'
import { shopContactHref, shopContactIcon } from './shopContactHref'

describe('shopContactIcon', () => {
  it('has one icon per kind', () => {
    expect(shopContactIcon({ kind: 'url', url: 'https://loja.com', ctaLabel: 'x' })).toBe('i-ph-arrow-square-out')
    expect(shopContactIcon({ kind: 'whatsapp', whatsapp: PhoneNumberSchema.parse('67991234567'), message: null, ctaLabel: null })).toBe('i-ph-whatsapp-logo')
  })
})

describe('shopContactHref', () => {
  it('builds the wa.me link with the message for the whatsapp kind', () => {
    expect(
      shopContactHref({ kind: 'whatsapp', whatsapp: PhoneNumberSchema.parse('67991234567'), message: 'Oi', ctaLabel: null }),
    ).toBe('https://wa.me/5567991234567?text=Oi')
  })
  it('returns the pasted url for the url kind', () => {
    expect(shopContactHref({ kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar' })).toBe(
      'https://loja.com/x',
    )
  })
})
