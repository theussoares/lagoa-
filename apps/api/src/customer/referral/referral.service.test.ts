import { describe, expect, it } from 'vitest'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { type CaptureAttempt, type CaptureOutcome, ReferralRepository } from './referral.repository'
import { ReferralService } from './referral.service'

class FakeReferralRepository extends ReferralRepository {
  attempts: CaptureAttempt[] = []
  constructor(
    private readonly outcome: CaptureOutcome = 'captured',
    private readonly ownCode: string | null = 'ACDEFGHJ',
  ) {
    super()
  }
  async findOwnReferralCode(): Promise<string | null> {
    return this.ownCode
  }
  async capture(attempt: CaptureAttempt): Promise<CaptureOutcome> {
    this.attempts.push(attempt)
    return this.outcome
  }
}

describe('ReferralService.capture', () => {
  it('normalizes what came in the link before looking anything up', async () => {
    const repository = new FakeReferralRepository()
    await new ReferralService(repository).capture(TEST_USER.id, ' acde-fghj ', 'nav-4k7')
    expect(repository.attempts).toEqual([{ referredId: TEST_USER.id, referralCode: 'ACDEFGHJ', shopCode: 'NAV4K7' }])
  })

  it.each(['captured', 'unknownReferrer', 'unknownShop', 'selfReferral', 'referralDisabled', 'alreadyCustomer', 'alreadyReferred'] as const)(
    'answers the same for "%s": nobody can use this to learn who has an account or which shop pays',
    async (outcome) => {
      expect(await new ReferralService(new FakeReferralRepository(outcome)).capture(TEST_USER.id, 'ACDEFGHJ', 'NAV4K7')).toEqual({ ok: true, value: undefined })
    },
  )

  it('ignores junk codes without touching the database', async () => {
    const repository = new FakeReferralRepository()
    const service = new ReferralService(repository)
    expect(await service.capture(TEST_USER.id, 'x', 'NAV4K7')).toEqual({ ok: true, value: undefined })
    expect(await service.capture(TEST_USER.id, 'ACDEFGHJ', '000000')).toEqual({ ok: true, value: undefined })
    expect(repository.attempts).toHaveLength(0)
  })

  it('tells only a login without a customer profile that it must register first', async () => {
    expect(await new ReferralService(new FakeReferralRepository('noProfile')).capture(TEST_USER.id, 'ACDEFGHJ', 'NAV4K7')).toEqual({
      ok: false,
      error: { code: 'unauthorized' },
    })
  })
})

describe('ReferralService.invite', () => {
  it('gives the customer their own opaque code', async () => {
    expect(await new ReferralService(new FakeReferralRepository()).invite(TEST_USER.id)).toEqual({ ok: true, value: { referralCode: 'ACDEFGHJ' } })
  })

  it('answers notFound when there is no profile', async () => {
    expect(await new ReferralService(new FakeReferralRepository('captured', null)).invite(TEST_USER.id)).toEqual({
      ok: false,
      error: { code: 'notFound', entity: 'customer' },
    })
  })
})
