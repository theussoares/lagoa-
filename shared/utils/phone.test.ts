import { describe, expect, it } from 'vitest'
import { formatPhoneDraft, formatPhoneInput, maskPhone, parsePhoneNumber } from './phone'

describe('parsePhoneNumber', () => {
  it('accepts a formatted mobile number and keeps digits only', () => {
    const result = parsePhoneNumber('(67) 99123-0374')
    expect(result.ok && result.value).toBe('67991230374')
  })

  it('drops the Brazil country code', () => {
    const result = parsePhoneNumber('+55 67 99123-0374')
    expect(result.ok && result.value).toBe('67991230374')
  })

  it.each(['6799123037', '67891230374', '07991230374', ''])('rejects %s', (input) => {
    expect(parsePhoneNumber(input)).toEqual({ ok: false, error: { code: 'invalidPhone' } })
  })
})

describe('maskPhone', () => {
  it('shows only area code and last four digits', () => {
    const result = parsePhoneNumber('67991230374')
    if (!result.ok) throw new Error('fixture')
    expect(maskPhone(result.value)).toBe('(67) 9••••-0374')
  })
})

describe('formatPhoneDraft', () => {
  it('fills the counter display as digits are typed', () => {
    expect(formatPhoneDraft('')).toBe('(__) _____-____')
    expect(formatPhoneDraft('679')).toBe('(67) 9____-____')
    expect(formatPhoneDraft('67991230374')).toBe('(67) 99123-0374')
  })
})

describe('formatPhoneInput', () => {
  it('formats only what was typed, so the caret never lands on a placeholder', () => {
    expect(formatPhoneInput('')).toBe('')
    expect(formatPhoneInput('6')).toBe('(6')
    expect(formatPhoneInput('679')).toBe('(67) 9')
    expect(formatPhoneInput('6799123')).toBe('(67) 99123')
    expect(formatPhoneInput('67991230')).toBe('(67) 99123-0')
    expect(formatPhoneInput('67991230374')).toBe('(67) 99123-0374')
  })

  it('accepts pasted numbers with country code and ignores extra digits', () => {
    expect(formatPhoneInput('+55 (67) 99123-0374')).toBe('(67) 99123-0374')
    expect(formatPhoneInput('679912303749')).toBe('(67) 99123-0374')
  })
})
