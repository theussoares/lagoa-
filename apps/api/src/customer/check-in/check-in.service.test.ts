import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Clock } from '../../common/clock'
import { generateReadableCode } from '../../common/readable-code'
import { generateVisitToken, hashVisitToken } from '../../common/visit-token'
import { ReferralSettlement, type SettlementOutcome } from '../../ledger/referral-settlement'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { CARD_ID, ENTRY_ID, FakeCheckInRepository, lockedVisitQr, SHOP_ID, stateOf, VISIT_QR_ID, visitQrTarget } from './check-in.fixtures'
import { ProgramVersionChanged, type VisitQrTarget } from './check-in.repository'
import { CheckInService } from './check-in.service'

const NOW = new Date('2026-10-03T12:00:00Z')

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
const serviceFor = (target: VisitQrTarget | null = visitQrTarget(), setup?: (repository: FakeCheckInRepository) => void) => {
  const repository = new FakeCheckInRepository(target)
  setup?.(repository)
  const referrals = new RecordingReferralSettlement()
  return { repository, referrals, service: new CheckInService(repository, clock, referrals) }
}

const TOKEN = generateVisitToken()

describe('CheckInService.claimVisitQr', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('what arrives', () => {
    it('answers shopQrJoinOnly for the legacy shop-code body, without touching the repository or referrals', async () => {
      const { repository, referrals, service } = serviceFor()
      expect(await service.claimVisitQr(TEST_USER.id, { code: 'NAV4K7' })).toEqual({ ok: false, error: { code: 'shopQrJoinOnly' } })
      expect(repository.calls).toEqual([])
      expect(referrals.calls).toEqual([])
    })

    it('looks the QR up by the hash of the token, never by the token', async () => {
      const { repository, service } = serviceFor()
      await service.claimVisitQr(TEST_USER.id, { token: ` ${TOKEN} ` })
      expect(repository.lookups).toHaveLength(1)
      const [lookup] = repository.lookups
      expect(lookup?.kind).toBe('tokenHash')
      expect(lookup?.kind === 'tokenHash' && lookup.tokenHash.equals(hashVisitToken(TOKEN))).toBe(true)
    })

    it('normalizes the typed code before looking it up', async () => {
      const code = generateReadableCode(5)
      const { repository, service } = serviceFor()
      await service.claimVisitQr(TEST_USER.id, { visitCode: ` ${code.slice(0, 2).toLowerCase()}-${code.slice(2).toLowerCase()} ` })
      expect(repository.lookups).toEqual([{ kind: 'visitCode', code }])
    })

    it.each([{ token: '' }, { token: 'short' }, { token: 'x'.repeat(44) }, { visitCode: '' }, { visitCode: '123' }, { visitCode: 'IIIII' }, { visitCode: 'ABCDEF' }])(
      'answers invalidVisitQr for a credential that cannot exist (%j) without a lookup',
      async (request) => {
        const { repository, service } = serviceFor()
        expect(await service.claimVisitQr(TEST_USER.id, request)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
        expect(repository.calls).toEqual([])
      },
    )

    it('answers invalidVisitQr when no usable QR matches, and never opens the claim', async () => {
      const { repository, service } = serviceFor(null)
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
      expect(repository.calls).toEqual(['find'])
    })
  })

  describe('order', () => {
    it('reads, then decides the QR use before the earning', async () => {
      const { repository, service } = serviceFor()
      await service.claimVisitQr(TEST_USER.id, { token: TOKEN })
      expect(repository.calls).toEqual(['find', 'claim', 'earning'])
    })

    it('never reaches the earning when the QR use is refused', async () => {
      const { repository, service } = serviceFor(visitQrTarget(), (r) => (r.qr = lockedVisitQr({ status: 'claimed', claimedBy: 'someone-else' })))
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toEqual({ ok: false, error: { code: 'visitQrAlreadyUsed' } })
      expect(repository.calls).toEqual(['find', 'claim'])
    })
  })

  describe('the answer', () => {
    it('answers the contract of a visit earned by a stamp QR', async () => {
      const { service } = serviceFor(visitQrTarget({ cooldownHours: 4 }), (r) => (r.state = stateOf({ balance: 4 })))
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toEqual({
        ok: true,
        value: {
          activity: {
            id: ENTRY_ID,
            shopId: SHOP_ID,
            shopName: 'Barbearia do Zé',
            kind: 'visit',
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

    it('reports the activity as an amount when the QR carries one', async () => {
      const { service } = serviceFor(visitQrTarget({ earn: { kind: 'amount', amountCents: 4590 } }))
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toMatchObject({ ok: true, value: { activity: { kind: 'amount' } } })
    })

    it('marks the reward ready when the visit completes the card', async () => {
      const { service } = serviceFor(visitQrTarget(), (r) => (r.state = stateOf({ balance: 9 })))
      expect(await service.claimVisitQr(TEST_USER.id, { visitCode: generateReadableCode(5) })).toMatchObject({ ok: true, value: { card: { balance: 10, rewardReady: true } } })
    })

    it('answers a replay with the recorded visit, at its own time', async () => {
      const { service } = serviceFor(visitQrTarget({ cooldownHours: 4 }), (r) => (r.qr = lockedVisitQr({ status: 'claimed', claimedBy: TEST_USER.id })))
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toMatchObject({
        ok: true,
        value: { activity: { id: ENTRY_ID, units: 1, createdAt: '2026-10-03T11:00:00.000Z' }, card: { balance: 5 }, nextCheckInAt: '2026-10-03T15:00:00.000Z' },
      })
    })
  })

  describe('refusal by the window', () => {
    const insideWindow = (r: FakeCheckInRepository) => (r.state = stateOf({ balance: 1, lastVisitAt: new Date('2026-10-03T08:00:00Z') }))

    it('passes the cooldown through with the time it opens and notes it on the QR once', async () => {
      const { repository, service } = serviceFor(visitQrTarget(), insideWindow)
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toEqual({
        ok: false,
        error: { code: 'checkInCooldown', availableAt: '2026-10-04T08:00:00.000Z' },
      })
      expect(repository.refusals).toEqual([{ visitQrId: VISIT_QR_ID, availableAt: new Date('2026-10-04T08:00:00.000Z'), refusedAt: NOW }])
    })

    it.each([
      ['an expired QR', lockedVisitQr({ expiresAt: NOW })],
      ['a cancelled QR', lockedVisitQr({ status: 'cancelled', cancelReason: 'merchant' })],
      ['a stale QR', lockedVisitQr({ activeProgramId: 'p2' })],
      ['a used QR', lockedVisitQr({ status: 'claimed', claimedBy: 'someone-else' })],
    ])('does not note anything on the QR for %s', async (_name, qr) => {
      const { repository, service } = serviceFor(visitQrTarget(), (r) => (r.qr = qr))
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toMatchObject({ ok: false })
      expect(repository.refusals).toEqual([])
      expect(repository.calls).not.toContain('noteRefusal')
    })

    it('still answers the cooldown when the note fails, logging only the error type', async () => {
      const logged: string[] = []
      vi.spyOn(Logger.prototype, 'warn').mockImplementation((message: unknown) => {
        logged.push(String(message))
      })
      const { service } = serviceFor(visitQrTarget(), (r) => {
        insideWindow(r)
        r.noteFails = true
      })
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toMatchObject({ ok: false, error: { code: 'checkInCooldown' } })
      expect(logged).toHaveLength(1)
      expect(logged[0]).toContain('Error')
      expect(logged[0]).not.toContain('secret')
    })
  })

  describe('referral', () => {
    it('settles after a new visit, for the shop of the QR', async () => {
      const { referrals, service } = serviceFor()
      await service.claimVisitQr(TEST_USER.id, { token: TOKEN })
      expect(referrals.calls).toEqual([{ referredId: TEST_USER.id, shopId: SHOP_ID }])
    })

    it('does not settle on a replay nor on a refusal', async () => {
      const replay = serviceFor(visitQrTarget(), (r) => (r.qr = lockedVisitQr({ status: 'claimed', claimedBy: TEST_USER.id })))
      await replay.service.claimVisitQr(TEST_USER.id, { token: TOKEN })
      const refused = serviceFor(visitQrTarget(), (r) => (r.state = stateOf({ balance: 1, lastVisitAt: new Date('2026-10-03T08:00:00Z') })))
      await refused.service.claimVisitQr(TEST_USER.id, { token: TOKEN })
      expect(replay.referrals.calls).toHaveLength(0)
      expect(refused.referrals.calls).toHaveLength(0)
    })

    it('still answers the visit when paying the referral blows up, logging only the error type', async () => {
      const logged: string[] = []
      vi.spyOn(Logger.prototype, 'error').mockImplementation((message: unknown) => {
        logged.push(String(message))
      })
      const { referrals, service } = serviceFor()
      referrals.failWith = new Error('db down: key (phone_hash)=(secret)')
      expect(await service.claimVisitQr(TEST_USER.id, { token: TOKEN })).toMatchObject({ ok: true })
      expect(logged).toHaveLength(1)
      expect(logged[0]).toContain('Error')
      expect(logged[0]).not.toContain('secret')
      expect(logged[0]).not.toContain(TOKEN)
    })
  })

  describe('program version', () => {
    it('reads again once when the program changed under the lock, and gives up after that', async () => {
      const once = serviceFor(visitQrTarget(), (r) => (r.versionChanges = 1))
      expect((await once.service.claimVisitQr(TEST_USER.id, { token: TOKEN })).ok).toBe(true)
      expect(once.repository.calls.filter((call) => call === 'find')).toHaveLength(2)

      const twice = serviceFor(visitQrTarget(), (r) => (r.versionChanges = 2))
      await expect(twice.service.claimVisitQr(TEST_USER.id, { token: TOKEN })).rejects.toBeInstanceOf(ProgramVersionChanged)
    })
  })
})
