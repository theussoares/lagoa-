import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { PiiService } from './pii.service'

const env = {
  PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  PII_HASH_PEPPER: 'a-long-enough-test-pepper',
}

describe('PiiService', () => {
  const pii = new PiiService(env)

  it('round-trips encrypted values', () => {
    expect(pii.decrypt(pii.encrypt('67991230374'))).toBe('67991230374')
  })

  it('uses a fresh iv so ciphertexts differ', () => {
    expect(pii.encrypt('x').equals(pii.encrypt('x'))).toBe(false)
  })

  it('hashes the phone deterministically for lookup', () => {
    const phone = PhoneNumberSchema.parse('67991230374')
    expect(pii.hashPhone(phone).equals(pii.hashPhone(phone))).toBe(true)
    expect(pii.hashPhone(phone).equals(pii.hashPhone(PhoneNumberSchema.parse('67991230375')))).toBe(false)
  })

  it('treats e-mails that differ only by case or spaces as the same person', () => {
    expect(pii.hashEmail(' Ana@Example.com ').equals(pii.hashEmail('ana@example.com'))).toBe(true)
  })

  it('keeps phone and e-mail hashes apart even for the same text', () => {
    expect(pii.hashEmail('67991230374').equals(pii.hashPhone(PhoneNumberSchema.parse('67991230374')))).toBe(false)
  })

  it('starts every payload with the key version, so a rotation can tell old from new', () => {
    expect(pii.encrypt('x')[0]).toBe(1)
  })

  it('refuses a payload from an unknown key version', () => {
    const payload = pii.encrypt('67991230374')
    payload[0] = 2
    expect(() => pii.decrypt(payload)).toThrow('Unknown PII key version')
  })

  it('refuses a payload that was tampered with, header included', () => {
    const payload = pii.encrypt('67991230374')
    payload[payload.length - 1] = (payload[payload.length - 1] ?? 0) ^ 1
    expect(() => pii.decrypt(payload)).toThrow()
  })

  it('does not decrypt with another key', () => {
    const other = new PiiService({ PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'), PII_HASH_PEPPER: 'a-long-enough-test-pepper' })
    expect(() => other.decrypt(pii.encrypt('67991230374'))).toThrow()
  })
})
