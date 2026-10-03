import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { PiiService } from './pii.service'
import type { Env } from '../config/env'

const env = {
  PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  PII_HASH_PEPPER: 'a-long-enough-test-pepper',
} as Env

describe('PiiService', () => {
  const pii = new PiiService(env)

  it('round-trips encrypted values', () => {
    expect(pii.decrypt(pii.encrypt('67 99999-0374'))).toBe('67 99999-0374')
  })

  it('uses a fresh iv so ciphertexts differ', () => {
    expect(pii.encrypt('x').equals(pii.encrypt('x'))).toBe(false)
  })

  it('hashes deterministically for lookup', () => {
    expect(pii.hash('67 99999-0374').equals(pii.hash('67 99999-0374'))).toBe(true)
    expect(pii.hash('a').equals(pii.hash('b'))).toBe(false)
  })
})
