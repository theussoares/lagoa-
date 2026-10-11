import { describe, expect, it } from 'vitest'
import { AMOUNT_MAX_CENTS } from '../constants/domain'
import type { BonusRules, ProgramRules } from '../schemas/program'
import {
  decideVisitEarning,
  decideVisitQrUse,
  planVisitQrIssue,
  resolveVisitEarnInput,
  visitQrExpiresAt,
  visitQrStatusAt,
} from './visitQr'
import type { VisitEarningRequest, VisitQrSnapshot } from './visitQr'

const T0 = new Date('2026-10-03T12:00:00Z')
const at = (minutes: number, seconds = 0): Date => new Date(T0.getTime() + (minutes * 60 + seconds) * 1000)

const NO_BONUS: BonusRules = {
  welcomeBonus: { enabled: false, units: 1 },
  birthdayMultiplier: { enabled: false, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}
const STAMPS: ProgramRules = { mode: 'stamps', target: 10 }
const PER_VISIT: ProgramRules = { mode: 'pointsPerVisit', target: 100, pointsPerVisit: 10 }
const PER_REAL: ProgramRules = { mode: 'pointsPerCurrency', target: 200, pointsPerReal: 1 }

function snapshot(overrides: Partial<VisitQrSnapshot> = {}): VisitQrSnapshot {
  return {
    status: 'active',
    cancelReason: null,
    expiresAt: visitQrExpiresAt(T0),
    claimedBy: null,
    issuedBy: 'merchant-1',
    shopOwnerId: 'merchant-1',
    programId: 'p1',
    activeProgramId: 'p1',
    shopApproved: true,
    ...overrides,
  }
}

describe('visitQrExpiresAt / visitQrStatusAt', () => {
  it('expires five minutes after creation', () => {
    expect(visitQrExpiresAt(T0)).toEqual(at(5))
  })

  it('is active at T0 + 4:59 and expired at T0 + 5:00', () => {
    const qr = { status: 'active' as const, expiresAt: visitQrExpiresAt(T0) }
    expect(visitQrStatusAt(qr, at(4, 59))).toBe('active')
    expect(visitQrStatusAt(qr, at(5))).toBe('expired')
  })

  it('keeps a stored final status as is', () => {
    expect(visitQrStatusAt({ status: 'claimed', expiresAt: at(5) }, at(9))).toBe('claimed')
    expect(visitQrStatusAt({ status: 'cancelled', expiresAt: at(5) }, at(1))).toBe('cancelled')
  })
})

describe('decideVisitQrUse', () => {
  it('refuses the merchant who issued the QR or owns the shop, with the same answer as a QR that does not exist (R12)', () => {
    expect(decideVisitQrUse(snapshot(), 'merchant-1', at(1))).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    expect(decideVisitQrUse(snapshot({ issuedBy: 'staff-1' }), 'merchant-1', at(1))).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    expect(decideVisitQrUse(snapshot({ issuedBy: 'merchant-1', shopOwnerId: 'owner-2' }), 'owner-2', at(1))).toEqual({
      ok: false,
      error: { code: 'invalidVisitQr' },
    })
    expect(decideVisitQrUse(snapshot(), 'customer-9', at(1))).toEqual({ ok: true, value: 'claim' })
  })

  it('claims an active QR inside the validity', () => {
    expect(decideVisitQrUse(snapshot(), 'c1', at(4, 59))).toEqual({ ok: true, value: 'claim' })
  })

  it('refuses at T0 + 5:00 (CA-11)', () => {
    expect(decideVisitQrUse(snapshot(), 'c1', at(5))).toEqual({ ok: false, error: { code: 'visitQrExpired' } })
  })

  it('replays for the same customer even after the validity (CA-14)', () => {
    const claimed = snapshot({ status: 'claimed', claimedBy: 'c1' })
    expect(decideVisitQrUse(claimed, 'c1', at(30))).toEqual({ ok: true, value: 'replay' })
  })

  it('refuses a QR already used by someone else, or by an erased account', () => {
    expect(decideVisitQrUse(snapshot({ status: 'claimed', claimedBy: 'c2' }), 'c1', at(1))).toEqual({
      ok: false,
      error: { code: 'visitQrAlreadyUsed' },
    })
    expect(decideVisitQrUse(snapshot({ status: 'claimed', claimedBy: null }), 'c1', at(1))).toEqual({
      ok: false,
      error: { code: 'visitQrAlreadyUsed' },
    })
  })

  it('answers stale for a QR cancelled by a program change and invalid for one cancelled by the merchant', () => {
    const changed = snapshot({ status: 'cancelled', cancelReason: 'programChanged' })
    const cancelled = snapshot({ status: 'cancelled', cancelReason: 'merchant' })
    expect(decideVisitQrUse(changed, 'c1', at(1))).toEqual({ ok: false, error: { code: 'visitQrStale' } })
    expect(decideVisitQrUse(cancelled, 'c1', at(1))).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })

  it('answers stale when the active program version is not the one of the QR (CA-16)', () => {
    expect(decideVisitQrUse(snapshot({ activeProgramId: 'p2' }), 'c1', at(1))).toEqual({
      ok: false,
      error: { code: 'visitQrStale' },
    })
  })

  it('treats a shop that is not approved (or without program) as an unknown QR, before anything else (CA-17)', () => {
    const claimedElsewhere = snapshot({ status: 'claimed', claimedBy: 'c2', shopApproved: false })
    expect(decideVisitQrUse(claimedElsewhere, 'c1', at(1))).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    expect(decideVisitQrUse(snapshot({ activeProgramId: null }), 'c1', at(1))).toEqual({
      ok: false,
      error: { code: 'invalidVisitQr' },
    })
  })

  it('checks cancellation before expiry', () => {
    const cancelledLate = snapshot({ status: 'cancelled', cancelReason: 'merchant' })
    expect(decideVisitQrUse(cancelledLate, 'c1', at(9))).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })
})

describe('planVisitQrIssue', () => {
  it('locks a visit for the per-visit modes and refuses an amount (CA-07)', () => {
    expect(planVisitQrIssue(STAMPS, undefined)).toEqual({ ok: true, value: { kind: 'visit' } })
    expect(planVisitQrIssue(PER_VISIT, undefined)).toEqual({ ok: true, value: { kind: 'visit' } })
    expect(planVisitQrIssue(STAMPS, 1000)).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
  })

  it.each([undefined, 0, -1, 10.5, AMOUNT_MAX_CENTS + 1, 50])('refuses %j in the per-real mode (CA-06)', (amount) => {
    expect(planVisitQrIssue(PER_REAL, amount)).toEqual({ ok: false, error: { code: 'invalidAmount' } })
  })

  it('locks the amount in the per-real mode', () => {
    expect(planVisitQrIssue(PER_REAL, 4590)).toEqual({ ok: true, value: { kind: 'amount', amountCents: 4590 } })
  })
})

describe('resolveVisitEarnInput (P-04)', () => {
  it('counts a QR with amount as one visit on a per-visit card', () => {
    expect(resolveVisitEarnInput(STAMPS, { kind: 'amount', amountCents: 4590 })).toEqual({ ok: true, value: { kind: 'visit' } })
  })

  it('keeps the amount on a per-real card', () => {
    expect(resolveVisitEarnInput(PER_REAL, { kind: 'amount', amountCents: 4590 })).toEqual({
      ok: true,
      value: { kind: 'amount', amountCents: 4590 },
    })
  })

  it('cannot earn on a per-real card from a QR without amount', () => {
    expect(resolveVisitEarnInput(PER_REAL, { kind: 'visit' })).toEqual({ ok: false, error: { code: 'visitQrStale' } })
  })
})

describe('decideVisitEarning', () => {
  function request(overrides: Partial<VisitEarningRequest> = {}): VisitEarningRequest {
    return {
      rules: STAMPS,
      bonusRules: NO_BONUS,
      cooldown: { cooldownHours: 4, cooldownMode: 'rolling' },
      card: { balance: 3, rewardExpiresAt: null, lastVisitAt: new Date('2026-09-01T12:00:00Z') },
      birthday: null,
      earn: { kind: 'visit' },
      now: T0,
      ...overrides,
    }
  }

  it('adds one stamp to a 3/10 card (CA-10)', () => {
    const result = decideVisitEarning(request())
    expect(result.ok && result.value).toMatchObject({ units: 1, balanceAfter: 4, welcomeUnits: 0 })
  })

  it('refuses inside the anti-fraud window with the moment it opens (CA-15)', () => {
    const lastVisitAt = new Date(T0.getTime() - 60 * 60 * 1000)
    const result = decideVisitEarning(request({ card: { balance: 3, rewardExpiresAt: null, lastVisitAt } }))
    expect(result).toEqual({ ok: false, error: { code: 'checkInCooldown', availableAt: '2026-10-03T15:00:00.000Z' } })
  })

  it('gives the welcome units on the first visit (CA-19)', () => {
    const welcome = { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } }
    const card = { balance: 0, rewardExpiresAt: null, lastVisitAt: null }
    const result = decideVisitEarning(request({ bonusRules: welcome, card }))
    expect(result.ok && result.value).toMatchObject({ welcomeUnits: 2, units: 1, balanceAfter: 3 })
  })

  it('does not stack birthday and surprise day (CA-20)', () => {
    const bonus: BonusRules = {
      ...NO_BONUS,
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-03' },
    }
    const result = decideVisitEarning(request({ bonusRules: bonus, birthday: '10-03' }))
    expect(result.ok && result.value.units).toBe(2)
  })

  it('earns the points of the locked amount (CA-12)', () => {
    const card = { balance: 0, rewardExpiresAt: null, lastVisitAt: new Date('2026-09-01T12:00:00Z') }
    const result = decideVisitEarning(request({ rules: PER_REAL, card, earn: { kind: 'amount', amountCents: 4590 } }))
    expect(result.ok && result.value.units).toBe(45)
  })

  it('answers stale before the window when the card version cannot take the QR', () => {
    const lastVisitAt = new Date(T0.getTime() - 60 * 60 * 1000)
    const result = decideVisitEarning(request({ rules: PER_REAL, card: { balance: 0, rewardExpiresAt: null, lastVisitAt } }))
    expect(result).toEqual({ ok: false, error: { code: 'visitQrStale' } })
  })
})
