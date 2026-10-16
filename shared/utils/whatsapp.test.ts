import { describe, expect, it } from 'vitest'
import { whatsappLink } from './whatsapp'

describe('whatsappLink', () => {
  it('opens the chat with the shop number, with the country code and no message', () => {
    expect(whatsappLink('67991234567')).toBe('https://wa.me/5567991234567')
  })
  it('adds the ready message url-encoded, line breaks included', () => {
    expect(whatsappLink('67991234567', 'Oi! Quero agendar\namanhã')).toBe(
      'https://wa.me/5567991234567?text=Oi!%20Quero%20agendar%0Aamanh%C3%A3',
    )
  })
  it('survives a lone surrogate instead of throwing', () => {
    expect(() => whatsappLink('67991234567', 'Oi \uD83D')).not.toThrow()
    expect(whatsappLink('67991234567', 'Oi \uD83D')).toBe('https://wa.me/5567991234567?text=Oi%20%EF%BF%BD')
  })
  it('ignores an empty or null message', () => {
    expect(whatsappLink('67991234567', null)).toBe('https://wa.me/5567991234567')
    expect(whatsappLink('67991234567', '')).toBe('https://wa.me/5567991234567')
  })
})
