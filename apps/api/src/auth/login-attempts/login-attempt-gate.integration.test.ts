import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ADMIN_LOGIN_ATTEMPTS_MAX, LOGIN_VERIFY_ATTEMPTS_MAX } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { rateLimits } from '../../database/schema'
import { createTestPii } from '../../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { PostgresThrottlerStorage } from '../../throttling/postgres-throttler.storage'
import { adminLoginAttemptKey, LoginAttemptGate, loginAttemptKey } from './login-attempt-gate'

/** Duas instâncias da API sobre o mesmo banco: o teto por celular vale para a soma, não por instância. */
describe.skipIf(!TEST_DATABASE_URL)('LoginAttemptGate on a real database', () => {
  let data: TestDatabase
  const pii = createTestPii()
  // Celular novo a cada execução: o pepper do teste é fixo e a linha de outra rodada poderia sobrar.
  const phone = PhoneNumberSchema.parse(`6799${String(Date.now()).slice(-7)}`)
  const email = `admin-${Date.now()}@rede.test`

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
  })

  afterAll(async () => {
    await data.db.delete(rateLimits).where(sql`${rateLimits.key} in (${loginAttemptKey(pii.hashPhone(phone))}, ${adminLoginAttemptKey(pii.hashEmail(email))})`)
    await data.close()
  })

  it('shares the cap across instances and refuses past it', async () => {
    const instanceA = new LoginAttemptGate(new PostgresThrottlerStorage(data.db, { random: () => 1 }), pii)
    const instanceB = new LoginAttemptGate(new PostgresThrottlerStorage(data.db, { random: () => 1 }), pii)
    const answers: boolean[] = []
    for (let attempt = 0; attempt < LOGIN_VERIFY_ATTEMPTS_MAX; attempt += 1) {
      answers.push(await (attempt % 2 === 0 ? instanceA : instanceB).allow(phone))
    }
    expect(answers.every(Boolean)).toBe(true)
    expect(await instanceA.allow(phone)).toBe(false)
    expect(await instanceB.allow(phone)).toBe(false)
  })

  it('shares the admin e-mail cap across instances and refuses past it', async () => {
    const instanceA = new LoginAttemptGate(new PostgresThrottlerStorage(data.db, { random: () => 1 }), pii)
    const instanceB = new LoginAttemptGate(new PostgresThrottlerStorage(data.db, { random: () => 1 }), pii)
    const answers: string[] = []
    for (let attempt = 0; attempt < ADMIN_LOGIN_ATTEMPTS_MAX; attempt += 1) {
      answers.push(await (attempt % 2 === 0 ? instanceA : instanceB).reserveAdminLogin(email))
    }
    expect(answers.every((answer) => answer === 'allowed')).toBe(true)
    expect(await instanceA.reserveAdminLogin(email)).toBe('refused')
    expect(await instanceB.reserveAdminLogin(email.toUpperCase())).toBe('refused')
  })
})
