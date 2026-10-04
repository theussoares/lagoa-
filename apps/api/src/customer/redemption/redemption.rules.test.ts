import { describe, expect, it } from 'vitest'
import { decideRedemptionRequest } from './redemption.rules'

const now = new Date('2026-10-03T12:00:00Z')
const inMinutes = (minutes: number): Date => new Date(now.getTime() + minutes * 60_000)

describe('decideRedemptionRequest', () => {
  it('refuses a card that has not reached the target and says how much is left', () => {
    expect(decideRedemptionRequest({ balance: 7, target: 10, active: null }, now)).toEqual({ kind: 'notReady', remaining: 3 })
  })

  it('creates a code for a ready card with none yet', () => {
    expect(decideRedemptionRequest({ balance: 10, target: 10, active: null }, now)).toEqual({ kind: 'create', expireStaleId: null })
  })

  it('also creates when the balance went past the target', () => {
    expect(decideRedemptionRequest({ balance: 14, target: 10, active: null }, now).kind).toBe('create')
  })

  it('gives back the active code while it is still valid', () => {
    expect(decideRedemptionRequest({ balance: 10, target: 10, active: { id: 'r1', expiresAt: inMinutes(3) } }, now)).toEqual({ kind: 'reuse' })
  })

  it('replaces a code that expired, retiring the old one', () => {
    expect(decideRedemptionRequest({ balance: 10, target: 10, active: { id: 'r1', expiresAt: inMinutes(-1) } }, now)).toEqual({
      kind: 'create',
      expireStaleId: 'r1',
    })
  })

  it('treats a code that expires exactly now as expired', () => {
    expect(decideRedemptionRequest({ balance: 10, target: 10, active: { id: 'r1', expiresAt: now } }, now).kind).toBe('create')
  })
})
