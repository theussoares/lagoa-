import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appUsers, customerProfiles } from '../../database/schema'
import { createTestPii } from '../../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleProfileRepository } from '../profile/drizzle-profile.repository'
import { SessionService } from '../session/session.service'
import { DrizzleRegistrationRepository } from './drizzle-registration.repository'
import { RegistrationService } from './registration.service'

const SLOW = 30_000

/** Os nomes das constraints do banco são o contrato do repository: aqui se prova que batem. */
describe.skipIf(!TEST_DATABASE_URL)('registration against a real database', () => {
  let data: TestDatabase
  let service: RegistrationService
  const pii = createTestPii()
  const created: string[] = []
  const uniquePhone = (): string => `6799${String(Math.floor(Math.random() * 1_000_0000)).padStart(7, '0')}`

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new RegistrationService(
      new DrizzleRegistrationRepository(data.db),
      new SessionService(new DrizzleProfileRepository(data.db)),
      pii,
    )
  })

  afterAll(async () => {
    await data.db.delete(customerProfiles).where(inArray(customerProfiles.userId, created))
    await data.db.delete(appUsers).where(inArray(appUsers.id, created))
    await data.close()
  })

  const newUser = (): { id: string; email: string } => {
    const id = randomUUID()
    created.push(id)
    return { id, email: `${id}@test.lagoa` }
  }

  it('creates the user and profile together and answers the session of a new customer', async () => {
    const user = newUser()
    const result = await service.register(user.id, user.email, `(${uniquePhone().slice(0, 2)}) ${uniquePhone().slice(2)}`)
    expect(result).toEqual({ ok: true, value: { role: 'customer', customerId: user.id, isNewCustomer: true } })
    const [profile] = await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id))
    expect(profile?.referralCode).toHaveLength(8)
  }, SLOW)

  it('is idempotent for the same account', async () => {
    const user = newUser()
    const phone = uniquePhone()
    await service.register(user.id, user.email, phone)
    expect(await service.register(user.id, user.email, phone)).toMatchObject({ ok: true, value: { customerId: user.id } })
    expect(await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id))).toHaveLength(1)
  }, SLOW)

  it('refuses a phone that belongs to another account, leaving nothing behind', async () => {
    const [first, second] = [newUser(), newUser()]
    const phone = uniquePhone()
    await service.register(first.id, first.email, phone)
    expect(await service.register(second.id, second.email, phone)).toEqual({ ok: false, error: { code: 'phoneAlreadyUsed' } })
    expect(await data.db.select().from(appUsers).where(eq(appUsers.id, second.id))).toHaveLength(0)
  }, SLOW)

  it('refuses an e-mail already tied to another account', async () => {
    const [first, second] = [newUser(), newUser()]
    await service.register(first.id, first.email, uniquePhone())
    expect(await service.register(second.id, first.email, uniquePhone())).toEqual({ ok: false, error: { code: 'emailAlreadyUsed' } })
  }, SLOW)

  it('lets a merchant (who already has a user row) become a customer, keeping the stored phone', async () => {
    const merchant = await data.createCustomer({ withProfile: false })
    created.push(merchant)
    const result = await service.register(merchant, `${merchant}@other.lagoa`, uniquePhone())
    expect(result).toMatchObject({ ok: true, value: { customerId: merchant } })
    expect(await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, merchant))).toHaveLength(1)
  }, SLOW)

  it('registers only one of many simultaneous attempts for the same account', async () => {
    const user = newUser()
    const phone = uniquePhone()
    const results = await Promise.all(Array.from({ length: 5 }, () => service.register(user.id, user.email, phone)))
    expect(results.every((r) => r.ok)).toBe(true)
    expect(await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, user.id))).toHaveLength(1)
  }, SLOW)
})
