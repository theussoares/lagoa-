import type { ThrottlerStorage } from '@nestjs/throttler'
import { describe, expect, it } from 'vitest'
import { LOGIN_VERIFY_ATTEMPTS_MAX, LOGIN_VERIFY_WINDOW_MINUTES } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { createTestPii } from '../../test-support/pii'
import { toStorageRecord, type ThrottlerRecord } from '../../throttling/throttle-window.rules'
import { LoginAttemptGate } from './login-attempt-gate'

const PHONE = PhoneNumberSchema.parse('67991230374')
const OTHER = PhoneNumberSchema.parse('67991230375')

/** Mesma conta do upsert do Postgres, sem banco: soma por chave e barra acima do limite. */
class InMemoryCounter implements ThrottlerStorage {
  readonly hits = new Map<string, number>()
  readonly calls: Array<{ key: string; ttl: number }> = []
  failing = false
  async increment(key: string, ttl: number, limit: number, blockDuration: number): Promise<ThrottlerRecord> {
    if (this.failing) throw new Error('database down')
    this.calls.push({ key, ttl })
    const hits = (this.hits.get(key) ?? 0) + 1
    this.hits.set(key, hits)
    return toStorageRecord({ hits, windowLeftMs: ttl, blockLeftMs: 0 }, limit, blockDuration)
  }
}

function setup() {
  const counter = new InMemoryCounter()
  return { counter, gate: new LoginAttemptGate(counter, createTestPii()) }
}

describe('LoginAttemptGate', () => {
  it(`lets a phone try ${LOGIN_VERIFY_ATTEMPTS_MAX} codes in the window and refuses the next`, async () => {
    const { gate } = setup()
    for (let attempt = 0; attempt < LOGIN_VERIFY_ATTEMPTS_MAX; attempt += 1) expect(await gate.allow(PHONE)).toBe(true)
    expect(await gate.allow(PHONE)).toBe(false)
  })

  it('counts each phone on its own', async () => {
    const { gate } = setup()
    for (let attempt = 0; attempt <= LOGIN_VERIFY_ATTEMPTS_MAX; attempt += 1) await gate.allow(PHONE)
    expect(await gate.allow(OTHER)).toBe(true)
  })

  it('keys the counter by the phone hash, never the number, over the configured window', async () => {
    const { counter, gate } = setup()
    await gate.allow(PHONE)
    expect(counter.calls[0]?.key).toMatch(/^login-verify:[0-9a-f]{64}$/)
    expect(counter.calls[0]?.key).not.toContain('991230374')
    expect(counter.calls[0]?.ttl).toBe(LOGIN_VERIFY_WINDOW_MINUTES * 60_000)
  })

  it('refuses when the counter is down (fail-closed)', async () => {
    const { counter, gate } = setup()
    counter.failing = true
    expect(await gate.allow(PHONE)).toBe(false)
  })
})
