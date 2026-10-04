import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TERMS_VERSION } from '#shared/constants/domain'
import { SystemClock } from '../../common/clock'
import { customerProfiles } from '../../database/schema'
import { createTestPii } from '../../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleProfileRepository } from './drizzle-profile.repository'
import { ProfileService } from './profile.service'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('profile against a real database', () => {
  let data: TestDatabase
  let service: ProfileService
  const pii = createTestPii()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new ProfileService(new DrizzleProfileRepository(data.db), pii, new SystemClock())
  })

  afterAll(async () => data.close())

  async function customerWithPhone(phone: string): Promise<string> {
    const id = await data.createCustomer()
    await data.setPhone(id, pii.encrypt(phone))
    return id
  }

  it('reads the profile with the phone masked and never the raw digits', async () => {
    const id = await customerWithPhone('67991230374')
    const result = await service.get(id)
    expect(result).toMatchObject({ ok: true, value: { id, maskedPhone: '(67) 9••••-0374', firstName: null } })
    expect(JSON.stringify(result)).not.toContain('67991230374')
  }, SLOW)

  it('answers notFound for a login with no customer profile', async () => {
    const ghost = await data.createCustomer({ withProfile: false })
    expect(await service.get(ghost)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  }, SLOW)

  it('saves name and birthday, locks the next change for a year, and lets the name change meanwhile', async () => {
    const id = await customerWithPhone('67991230374')
    expect(await service.update(id, { firstName: 'Ana', birthday: '03-14' })).toMatchObject({ ok: true, value: { birthday: '03-14' } })
    expect(await service.update(id, { firstName: 'Ana', birthday: '07-01' })).toMatchObject({ ok: false, error: { code: 'birthdayLocked' } })
    expect(await service.update(id, { firstName: 'Ana Paula', birthday: '03-14' })).toMatchObject({ ok: true, value: { firstName: 'Ana Paula' } })
  }, SLOW)

  it('lets only one of two simultaneous birthday changes win', async () => {
    const id = await customerWithPhone('67991230374')
    const results = await Promise.all([
      service.update(id, { firstName: null, birthday: '01-10' }),
      service.update(id, { firstName: null, birthday: '02-20' }),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)).toMatchObject([{ error: { code: 'birthdayLocked' } }])
  }, SLOW)

  it('records consent and its time, and revokes it', async () => {
    const id = await customerWithPhone('67991230374')
    expect(await service.setNotificationConsent(id, true)).toMatchObject({ ok: true, value: { consent: { notifications: true } } })
    const revoked = await service.setNotificationConsent(id, false)
    expect(revoked).toMatchObject({ ok: true, value: { consent: { notifications: false } } })
    expect(revoked.ok && revoked.value.consent.updatedAt).not.toBeNull()
  }, SLOW)

  it('stamps the terms acceptance with the version shown, keeps it on repeat, and asks again when the terms change', async () => {
    const id = await customerWithPhone('67991230374')
    const repository = new DrizzleProfileRepository(data.db)
    expect(await repository.findTerms(id)).toEqual({ termsAcceptedAt: null, termsVersion: null })
    await service.acceptTerms(id)
    const [first] = await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, id))
    expect(first?.termsVersion).toBe(TERMS_VERSION)
    await service.acceptTerms(id)
    const [again] = await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, id))
    expect(again?.termsAcceptedAt).toEqual(first?.termsAcceptedAt)

    await data.db.update(customerProfiles).set({ termsVersion: 'older' }).where(eq(customerProfiles.userId, id))
    await service.acceptTerms(id)
    const [renewed] = await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, id))
    expect(renewed?.termsVersion).toBe(TERMS_VERSION)
  }, SLOW)
})
