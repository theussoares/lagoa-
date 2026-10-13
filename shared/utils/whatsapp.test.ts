import { describe, expect, it } from 'vitest'
import { whatsappLink } from './whatsapp'

describe('whatsappLink', () => {
  it('opens the chat with the shop number, with the country code and no message', () => {
    expect(whatsappLink('67991234567')).toBe('https://wa.me/5567991234567')
  })
})
