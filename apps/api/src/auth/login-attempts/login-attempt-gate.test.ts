import type { ThrottlerStorage } from '@nestjs/throttler'
import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_LOGIN_ATTEMPTS_MAX, ADMIN_LOGIN_WINDOW_MINUTES, LOGIN_VERIFY_ATTEMPTS_MAX, LOGIN_VERIFY_WINDOW_MINUTES } from '#shared/constants/domain'
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

afterEach(() => vi.restoreAllMocks())

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
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    expect(await gate.allow(PHONE)).toBe(false)
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('LoginAttemptGate for admin password logins', () => {
  const EMAIL = 'ana@rede.test'

  it(`lets an e-mail try ${ADMIN_LOGIN_ATTEMPTS_MAX} times in the window and refuses the next`, async () => {
    const { gate } = setup()
    for (let attempt = 0; attempt < ADMIN_LOGIN_ATTEMPTS_MAX; attempt += 1) expect(await gate.reserveAdminLogin(EMAIL)).toBe('allowed')
    expect(await gate.reserveAdminLogin(EMAIL)).toBe('refused')
  })

  it('keys the counter by the e-mail hash, never the e-mail, apart from the phone counters', async () => {
    const { counter, gate } = setup()
    await gate.reserveAdminLogin(EMAIL)
    expect(counter.calls[0]?.key).toMatch(/^admin-login:[0-9a-f]{64}$/)
    expect(counter.calls[0]?.key).not.toContain('ana')
    expect(counter.calls[0]?.ttl).toBe(ADMIN_LOGIN_WINDOW_MINUTES * 60_000)
  })

  it('counts the same e-mail written with spaces or capitals as one', async () => {
    const { counter, gate } = setup()
    await gate.reserveAdminLogin(EMAIL)
    await gate.reserveAdminLogin(' Ana@Rede.TEST ')
    expect(new Set(counter.calls.map((call) => call.key)).size).toBe(1)
  })

  it('answers unavailable when the counter is down (fail-closed, told apart from the cap)', async () => {
    const { counter, gate } = setup()
    counter.failing = true
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    expect(await gate.reserveAdminLogin(EMAIL)).toBe('unavailable')
    expect(warn.mock.calls.join('\n')).not.toContain('ana@')
  })
})
