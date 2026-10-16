import { describe, expect, it } from 'vitest'
import { shopContactHref } from './shopContactHref'

describe('shopContactHref', () => {
  it('builds the wa.me link with the message for the whatsapp kind', () => {
    expect(
      shopContactHref({ kind: 'whatsapp', whatsapp: '67991234567', message: 'Oi', ctaLabel: null }),
    ).toBe('https://wa.me/5567991234567?text=Oi')
  })
  it('returns the pasted url for the url kind', () => {
    expect(shopContactHref({ kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar' })).toBe(
      'https://loja.com/x',
    )
  })
})
