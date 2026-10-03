import { describe, expect, it } from 'vitest'
import type { EarningPlan } from '#shared/domain/earning'
import type { ErrorOf } from '#shared/types/errors'
import { ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { checkInShop } from './check-in.fixtures'
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
  state: CheckInState = { card: null, lastVisitAt: null, birthday: null }
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

const clock: Clock = { now: () => NOW }
const serviceFor = (shop: CheckInShop | null, state?: CheckInState) => {
  const repository = new FakeCheckInRepository(shop)
  if (state) repository.state = state
  return { repository, service: new CheckInService(repository, clock) }
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
    const { service } = serviceFor(checkInShop({ cooldownHours: 4 }), { card: { balance: 4, rewardExpiresAt: null }, lastVisitAt: null, birthday: null })
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
    const { service } = serviceFor(checkInShop(), { card: { balance: 9, rewardExpiresAt: null }, lastVisitAt: null, birthday: null })
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toMatchObject({ ok: true, value: { card: { balance: 10, rewardReady: true } } })
  })

  it('passes the cooldown refusal through with the time it opens', async () => {
    const { service } = serviceFor(checkInShop(), { card: { balance: 1, rewardExpiresAt: null }, lastVisitAt: new Date('2026-10-03T08:00:00Z'), birthday: null })
    expect(await service.checkIn(TEST_USER.id, 'NAV4K7')).toEqual({
      ok: false,
      error: { code: 'checkInCooldown', availableAt: '2026-10-04T08:00:00.000Z' },
    })
  })
})
