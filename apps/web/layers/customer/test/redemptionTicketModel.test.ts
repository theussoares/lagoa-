import { describe, expect, it } from 'vitest'
import { RedemptionSchema } from '#shared/schemas/redemption'
import type { Redemption } from '#shared/schemas/redemption'
import type { Translate } from '#layers/core/app/types/i18n'
import {
  formatClock,
  minutesLeftAnnouncement,
  secondsUntil,
  toRedemptionTicketState,
} from '../app/utils/redemptionTicketModel'

const t: Translate = (key, named, plural) => [key, JSON.stringify(named ?? {}), plural ?? ''].join('|')

function redemption(status: Redemption['status']): Redemption {
  return RedemptionSchema.parse({
    id: 'red-1',
    code: 'NXQDLJ',
    cardId: 'card-1',
    shopId: 'shop-1',
    rewardTitle: 'Corte grátis',
    createdAt: '2026-10-01T12:00:00.000Z',
    expiresAt: '2026-10-01T12:10:00.000Z',
    status,
  })
}

describe('formatClock', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatClock(582)).toBe('9:42')
    expect(formatClock(60)).toBe('1:00')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(0)).toBe('0:00')
  })
})

describe('secondsUntil', () => {
  it('rounds up and never goes below zero', () => {
    const now = new Date('2026-10-01T12:00:00.000Z')
    expect(secondsUntil('2026-10-01T12:00:01.200Z', now)).toBe(2)
    expect(secondsUntil('2026-10-01T11:59:00.000Z', now)).toBe(0)
  })
})

describe('toRedemptionTicketState', () => {
  it('shows the code with the clock while active', () => {
    const state = toRedemptionTicketState(redemption('active'), 300, t)
    expect(state).toMatchObject({ kind: 'active', code: 'NXQDLJ', clock: '5:00', urgent: false, remainingFraction: 0.5 })
  })

  it('turns urgent in the last minute', () => {
    expect(toRedemptionTicketState(redemption('active'), 60, t)).toMatchObject({ urgent: true })
    expect(toRedemptionTicketState(redemption('active'), 61, t)).toMatchObject({ urgent: false })
  })

  it('keeps the expired code visible with a note', () => {
    expect(toRedemptionTicketState(redemption('expired'), 0, t)).toMatchObject({ kind: 'expired', code: 'NXQDLJ' })
  })

  it('drops the code once the reward was delivered', () => {
    const state = toRedemptionTicketState(redemption('redeemed'), 0, t)
    expect(state.kind).toBe('redeemed')
    expect(state).not.toHaveProperty('code')
  })
})

describe('minutesLeftAnnouncement', () => {
  it('only changes when the minute turns', () => {
    expect(minutesLeftAnnouncement(599, t)).toBe(minutesLeftAnnouncement(541, t))
    expect(minutesLeftAnnouncement(540, t)).not.toBe(minutesLeftAnnouncement(541, t))
  })
})
