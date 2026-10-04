import { Logger } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { EarningPlan } from '#shared/domain/earning'
import type { ErrorOf } from '#shared/types/errors'
import { ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { ReferralSettlement, type SettlementOutcome } from '../../ledger/referral-settlement'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { checkInShop, FIRST_VISIT, stateOf } from './check-in.fixtures'
import {
  type CheckInAttempt,
  type CheckInRecorded,
  CheckInRepository,
  type CheckInShop,
  type CheckInState,
} from './check-in.repository'
import { CheckInService } from './check-in.service'

const NOW = new Date('2026-10-03T12:00:00Z')
const ENTRY_ID = '0190a000-0000-7000-8000-0000000000e1'
const CARD_ID = '0190a000-0000-7000-8000-0000000000c1'

class FakeCheckInRepository extends CheckInRepository {
  lookedUp: string[] = []
  state: CheckInState = FIRST_VISIT
  constructor(private readonly shop: CheckInShop | null) {
    super()
  }
  async findShopByCode(code: string): Promise<CheckInShop | null> {
    this.lookedUp.push(code)
    return this.shop
  }
  async record<E>(
    _attempt: CheckInAttempt,
    decide: (state: CheckInState) => Result<EarningPlan, E>,
  ): Promise<Result<CheckInRecorded, E | ErrorOf<'unauthorized'>>> {
    const decision = decide(this.state)
    return decision.ok ? ok({ cardId: CARD_ID, entryId: ENTRY_ID, plan: decision.value }) : decision
  }
}

class RecordingReferralSettlement extends ReferralSettlement {
  calls: { referredId: string; shopId: string }[] = []
  failWith: Error | null = null
  async settlePending(referredId: string, shopId: string): Promise<SettlementOutcome> {
    this.calls.push({ referredId, shopId })
    if (this.failWith) throw this.failWith
    return 'none'
  }
}

const clock: Clock = { now: () => NOW }
const serviceFor = (shop: CheckInShop | null, state?: CheckInState) => {
  const repository = new FakeCheckInRepository(shop)
  if (state) repository.state = state
  const referrals = new RecordingReferralSettlement()
  return { repository, referrals, service: new CheckInService(repository, clock, referrals) }
}

describe('CheckInService', () => {
  it('normalizes what people type before looking the shop up', async () => {
    const { repository, service } = serviceFor(checkInShop())
    await service.checkIn(TEST_USER.id, ' nav-4k7 ')
    expect(repository.lookedUp).toEqual(['NAV4K7'])
  })

  it.each(['', '123', 'IIIIII', 'x'.repeat(6) + 'y'])('answers invalidShopQr for a code that cannot exist (%s) without a lookup', async (code) => {
    const { repository, service } = serviceFor(checkInShop())
    expect(await service.checkIn(TEST_USER.id, code)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    expect(repository.lookedUp).toHaveLength(0)
  })

  it('answers invalidShopQr when no approved shop has that code', async () => {
    expect(await serviceFor(null).service.checkIn(TEST_USER.id, 'NAV4K7')).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })

  it('answers checkInDisabled for a club that turned check-in off', async () => {
    const { service } = serviceFor(checkInShop({ checkInEnabled: false }))
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
  })

  it('answers the contract of a successful check-in', async () => {
    const { service } = serviceFor(checkInShop({ cooldownHours: 4 }), stateOf({ balance: 4, lastVisitAt: null }))
    const result = await service.checkIn(TEST_USER.id, 'NAV4K7')
    expect(result).toEqual({
      ok: true,
      value: {
        activity: {
          id: ENTRY_ID,
          shopId: '0190a000-0000-7000-8000-0000000000a1',
          shopName: 'Barbearia do Zé',
          kind: 'checkIn',
          unit: 'stamp',
          units: 1,
          rewardTitle: null,
          createdAt: '2026-10-03T12:00:00.000Z',
        },
        card: { cardId: CARD_ID, unit: 'stamp', balance: 5, target: 10, rewardReady: false },
        nextCheckInAt: '2026-10-03T16:00:00.000Z',
      },
    })
  })

  it('marks the reward ready when the check-in completes the card', async () => {
    const { service } = serviceFor(checkInShop(), stateOf({ balance: 9, lastVisitAt: null }))
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toMatchObject({ ok: true, value: { card: { balance: 10, rewardReady: true } } })
  })

  it('passes the cooldown refusal through with the time it opens', async () => {
    const { service } = serviceFor(checkInShop(), stateOf({ balance: 1, lastVisitAt: new Date('2026-10-03T08:00:00Z') }))
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toEqual({
      ok: false,
      error: { code: 'checkInCooldown', availableAt: '2026-10-04T08:00:00.000Z' },
    })
  })

  it('tries to settle the referral after every recorded check-in, so a failed attempt is retried on the next visit', async () => {
    const first = serviceFor(checkInShop())
    await first.service.checkIn(TEST_USER.id, 'NAV4K7')
    expect(first.referrals.calls).toEqual([{ referredId: TEST_USER.id, shopId: '0190a000-0000-7000-8000-0000000000a1' }])

    const returning = serviceFor(checkInShop(), stateOf({ balance: 4, lastVisitAt: new Date('2026-09-01T00:00:00Z') }))
    await returning.service.checkIn(TEST_USER.id, 'NAV4K7')
    expect(returning.referrals.calls).toHaveLength(1)
  })

  it('does not try to settle when the check-in itself was refused', async () => {
    const { service, referrals } = serviceFor(checkInShop(), stateOf({ balance: 1, lastVisitAt: new Date('2026-10-03T08:00:00Z') }))
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toMatchObject({ ok: false })
    expect(referrals.calls).toHaveLength(0)
  })

  it('still answers the check-in when paying the referral blows up, and logs only the error type', async () => {
    const logged: string[] = []
    const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation((message: unknown) => {
      logged.push(String(message))
    })
    const { service, referrals } = serviceFor(checkInShop())
    referrals.failWith = new Error('db down: key (phone_hash)=(secret)')
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toMatchObject({ ok: true })
    expect(logged).toHaveLength(1)
    expect(logged[0]).toContain('Error')
    expect(logged[0]).not.toContain('secret')
    spy.mockRestore()
  })
})
