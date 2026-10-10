import { describe, expect, it } from 'vitest'
import type { ProgramRules } from '#shared/schemas/program'
import { catalogShop, NO_BONUS } from '../../shops/catalog.fixtures'
import { FIRST_VISIT, lockedVisitQr, stateOf, visitQrTarget } from './check-in.fixtures'
import { decideEarning, decideQrUse } from './check-in.rules'

const now = new Date('2026-10-03T12:00:00Z')
const ME = '0190a000-0000-7000-8000-000000000001'
const OTHER = '0190a000-0000-7000-8000-000000000002'

const withProgram = (program: Partial<ReturnType<typeof catalogShop>['program']>) => catalogShop({ program: { ...catalogShop().program, ...program } })

describe('decideQrUse', () => {
  it('lets an active QR of the active program through', () => {
    expect(decideQrUse(lockedVisitQr(), ME, now)).toEqual({ ok: true, value: 'claim' })
  })

  it('answers replay to the person who already used it, even after it would have expired', () => {
    const used = lockedVisitQr({ status: 'claimed', claimedBy: ME, expiresAt: new Date('2026-10-03T11:00:00Z') })
    expect(decideQrUse(used, ME, now)).toEqual({ ok: true, value: 'replay' })
  })

  it('answers visitQrAlreadyUsed to anyone else', () => {
    expect(decideQrUse(lockedVisitQr({ status: 'claimed', claimedBy: OTHER }), ME, now)).toEqual({ ok: false, error: { code: 'visitQrAlreadyUsed' } })
  })

  it('treats the exact expiry instant as expired', () => {
    expect(decideQrUse(lockedVisitQr({ expiresAt: now }), ME, now)).toEqual({ ok: false, error: { code: 'visitQrExpired' } })
  })

  it('answers invalidVisitQr for a cancelled QR and for a shop that is no longer approved', () => {
    expect(decideQrUse(lockedVisitQr({ status: 'cancelled', cancelReason: 'merchant' }), ME, now)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    expect(decideQrUse(lockedVisitQr({ shopApproved: false }), ME, now)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })

  it('answers visitQrStale when the program changed, whether or not the QR was cancelled for it', () => {
    expect(decideQrUse(lockedVisitQr({ activeProgramId: 'p2' }), ME, now)).toEqual({ ok: false, error: { code: 'visitQrStale' } })
    expect(decideQrUse(lockedVisitQr({ status: 'cancelled', cancelReason: 'programChanged' }), ME, now)).toEqual({ ok: false, error: { code: 'visitQrStale' } })
  })
})

describe('decideEarning', () => {
  it('gives the welcome units with the first visit', () => {
    const target = visitQrTarget({ shop: withProgram({ bonusRules: { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } } }) })
    expect(decideEarning(target, FIRST_VISIT, now)).toMatchObject({ ok: true, value: { welcomeUnits: 2, units: 1, balanceAfter: 3 } })
  })

  it('holds a second visit inside the window and says when it opens', () => {
    const state = stateOf({ balance: 2, lastVisitAt: new Date('2026-10-03T10:00:00Z') })
    expect(decideEarning(visitQrTarget({ cooldown: { cooldownHours: 4, cooldownMode: 'rolling' } }), state, now)).toEqual({
      ok: false,
      error: { code: 'checkInCooldown', availableAt: '2026-10-03T14:00:00.000Z' },
    })
  })

  it('lets it through again once the window has passed', () => {
    const state = stateOf({ balance: 2, lastVisitAt: new Date('2026-10-02T11:00:00Z') })
    expect(decideEarning(visitQrTarget(), state, now)).toMatchObject({ ok: true, value: { balanceAfter: 3 } })
  })

  it('uses the window of the target (the active version), not anything stored on the card', () => {
    const state = stateOf({ balance: 2, lastVisitAt: new Date('2026-10-03T08:00:00Z') })
    expect(decideEarning(visitQrTarget({ cooldown: { cooldownHours: 2, cooldownMode: 'rolling' } }), state, now).ok).toBe(true)
    expect(decideEarning(visitQrTarget({ cooldown: { cooldownHours: 6, cooldownMode: 'rolling' } }), state, now).ok).toBe(false)
  })

  it('once per local day: 23h and 3h of the next day are two visits, two on the same day are not', () => {
    const daily = visitQrTarget({ cooldown: { cooldownHours: 24, cooldownMode: 'calendarDay' } })
    const at23h = new Date('2026-10-04T03:00:00Z') // 23h em Três Lagoas (UTC−4)
    expect(decideEarning(daily, stateOf({ balance: 2, lastVisitAt: at23h }), new Date('2026-10-04T07:00:00Z')).ok).toBe(true)
    expect(decideEarning(daily, stateOf({ balance: 2, lastVisitAt: at23h }), new Date('2026-10-04T03:30:00Z'))).toEqual({
      ok: false,
      error: { code: 'checkInCooldown', availableAt: '2026-10-04T04:00:00.000Z' },
    })
  })

  it('earns what the QR carries on a points-per-real card (CA-12)', () => {
    const rules: ProgramRules = { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 200 }
    const target = visitQrTarget({ shop: withProgram({ rules }), earn: { kind: 'amount', amountCents: 4590 } })
    expect(decideEarning(target, FIRST_VISIT, now)).toMatchObject({ ok: true, value: { units: 45 } })
  })

  it('counts one visit on a per-visit card even when the QR carries an amount, and refuses a visit QR on a per-real card', () => {
    expect(decideEarning(visitQrTarget({ earn: { kind: 'amount', amountCents: 4590 } }), FIRST_VISIT, now)).toMatchObject({ ok: true, value: { units: 1 } })
    const perReal = visitQrTarget({ shop: withProgram({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 200 } }) })
    expect(decideEarning(perReal, FIRST_VISIT, now)).toEqual({ ok: false, error: { code: 'visitQrStale' } })
  })

  it('gives 2, not 4, on a birthday that is also a surprise day (CA-20)', () => {
    const bonusRules = {
      ...NO_BONUS,
      birthdayMultiplier: { enabled: true, multiplier: 2 as const },
      surpriseDay: { enabled: true, multiplier: 2 as const, date: '2026-10-03' },
    }
    const target = visitQrTarget({ shop: withProgram({ bonusRules }) })
    expect(decideEarning(target, { ...FIRST_VISIT, birthday: '10-03' }, now)).toMatchObject({ ok: true, value: { units: 2 } })
  })
})
