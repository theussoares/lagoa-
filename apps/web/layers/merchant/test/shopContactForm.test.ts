import { describe, expect, it } from 'vitest'
import { formatWhatsapp, toContactUpdate, whatsappDigits } from '../app/utils/shopContactForm'

describe('whatsappDigits', () => {
  it('keeps only the digits and drops the country code of a pasted number', () => {
    expect(whatsappDigits('(67) 99123-4567')).toBe('67991234567')
    expect(whatsappDigits('+55 67 99123-4567')).toBe('67991234567')
  })
})

describe('formatWhatsapp', () => {
  it('shapes the number while it is typed', () => {
    expect(formatWhatsapp('6')).toBe('6')
    expect(formatWhatsapp('67991')).toBe('(67) 991')
    expect(formatWhatsapp('67991234567')).toBe('(67) 99123-4567')
    expect(formatWhatsapp('679912345678888')).toBe('(67) 99123-4567')
  })
})

describe('toContactUpdate', () => {
  it('clears the contact when the number is empty, whatever the button text says', () => {
    expect(toContactUpdate('', 'Pedir agora')).toEqual({ whatsapp: null, ctaLabel: null })
  })

  it('refuses a number that is not a mobile', () => {
    expect(toContactUpdate('6733211234', 'Pedir agora')).toBeNull()
    expect(toContactUpdate('123', '')).toBeNull()
  })

  it('keeps the button text, trimmed, or the default when empty', () => {
    expect(toContactUpdate('(67) 99123-4567', '  Agendar agora ')).toEqual({ whatsapp: '67991234567', ctaLabel: 'Agendar agora' })
    expect(toContactUpdate('67991234567', '   ')).toEqual({ whatsapp: '67991234567', ctaLabel: null })
  })

  it('cuts the text at the limit instead of failing', () => {
    expect(toContactUpdate('67991234567', 'x'.repeat(40))?.ctaLabel).toHaveLength(24)
  })
})
