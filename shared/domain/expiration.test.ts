import { describe, expect, it } from 'vitest'
import type { ExpirationPolicy } from '../schemas/program'
import { applyExpiration, inactivityDueAt, planExpiration } from './expiration'

const now = new Date('2026-10-03T12:00:00Z')
const NEVER: ExpirationPolicy = { kind: 'never' }
const SIX_MONTHS: ExpirationPolicy = { kind: 'afterInactivity', months: 6 }

describe('inactivityDueAt', () => {
  it('is null when the club never expires cards or the card has no visit yet', () => {
    expect(inactivityDueAt(new Date('2020-01-01T00:00:00Z'), NEVER)).toBeNull()
    expect(inactivityDueAt(null, SIX_MONTHS)).toBeNull()
  })

  it('is the last visit plus the months of the policy', () => {
    expect(inactivityDueAt(new Date('2026-01-15T10:00:00Z'), SIX_MONTHS)?.toISOString()).toBe('2026-07-15T10:00:00.000Z')
  })
})

describe('planExpiration', () => {
  it('does nothing for a card that is fine', () => {
    const card = { balance: 4, lastVisitAt: new Date('2026-09-01T00:00:00Z'), rewardExpiresAt: null }
    expect(planExpiration(card, SIX_MONTHS, 10, now)).toBeNull()
  })

  it('does nothing for an empty card, even if long idle', () => {
    expect(planExpiration({ balance: 0, lastVisitAt: new Date('2020-01-01T00:00:00Z'), rewardExpiresAt: null }, SIX_MONTHS, 10, now)).toBeNull()
  })

  it('wipes the whole balance after the inactivity window and says when it happened', () => {
    const card = { balance: 7, lastVisitAt: new Date('2026-03-01T00:00:00Z'), rewardExpiresAt: null }
    expect(planExpiration(card, SIX_MONTHS, 10, now)).toEqual({
      kind: 'inactivity',
      dueAt: new Date('2026-09-01T00:00:00Z'),
      unitsLost: 7,
      balanceAfter: 0,
      rewardExpiresAt: null,
    })
  })

  it('expires exactly at the boundary', () => {
    const card = { balance: 3, lastVisitAt: new Date('2026-04-03T12:00:00Z'), rewardExpiresAt: null }
    expect(planExpiration(card, SIX_MONTHS, 10, now)?.kind).toBe('inactivity')
  })

  it('never expires by inactivity when the policy is "never"', () => {
    const card = { balance: 3, lastVisitAt: new Date('2019-01-01T00:00:00Z'), rewardExpiresAt: null }
    expect(planExpiration(card, NEVER, 10, now)).toBeNull()
  })

  it('takes one target away when the held reward lapsed', () => {
    const card = { balance: 10, lastVisitAt: new Date('2026-08-01T00:00:00Z'), rewardExpiresAt: new Date('2026-10-01T00:00:00Z') }
    expect(planExpiration(card, NEVER, 10, now)).toEqual({
      kind: 'rewardHold',
      dueAt: new Date('2026-10-01T00:00:00Z'),
      unitsLost: 10,
      balanceAfter: 0,
      rewardExpiresAt: null,
    })
  })

  it('keeps the units above the target and starts a new hold when another full reward is left', () => {
    const card = { balance: 25, lastVisitAt: new Date('2026-09-20T00:00:00Z'), rewardExpiresAt: new Date('2026-10-01T00:00:00Z') }
    const plan = planExpiration(card, NEVER, 10, now)
    expect(plan).toMatchObject({ kind: 'rewardHold', unitsLost: 10, balanceAfter: 15 })
    expect(plan?.rewardExpiresAt?.toISOString()).toBe('2026-11-02T12:00:00.000Z')
  })

  it('does not hold a new reward when what is left is below the target', () => {
    const card = { balance: 13, lastVisitAt: new Date('2026-09-20T00:00:00Z'), rewardExpiresAt: new Date('2026-10-01T00:00:00Z') }
    expect(planExpiration(card, NEVER, 10, now)).toMatchObject({ balanceAfter: 3, rewardExpiresAt: null })
  })

  it('leaves a reward that is still inside its hold alone', () => {
    const card = { balance: 10, lastVisitAt: now, rewardExpiresAt: new Date('2026-10-20T00:00:00Z') }
    expect(planExpiration(card, NEVER, 10, now)).toBeNull()
  })

  it('prefers inactivity over the reward hold: everything is gone anyway', () => {
    const card = { balance: 10, lastVisitAt: new Date('2026-01-01T00:00:00Z'), rewardExpiresAt: new Date('2026-02-01T00:00:00Z') }
    expect(planExpiration(card, SIX_MONTHS, 10, now)?.kind).toBe('inactivity')
  })
})

describe('applyExpiration', () => {
  it('returns the same card when nothing expired', () => {
    const card = { balance: 4, lastVisitAt: null, rewardExpiresAt: null }
    expect(applyExpiration(card, null)).toBe(card)
  })

  it('shows the balance and hold the plan leaves', () => {
    const card = { id: 'c1', balance: 10, lastVisitAt: null, rewardExpiresAt: new Date('2026-10-01T00:00:00Z') }
    const plan = planExpiration(card, NEVER, 10, now)
    expect(applyExpiration(card, plan)).toEqual({ ...card, balance: 0, rewardExpiresAt: null })
  })
})
