import { describe, expect, it } from 'vitest'
import { planStatusChange, refuseSelf } from './team.rules'

const ACTOR = '0190a000-0000-7000-8000-00000000a001'
const OTHER = '0190a000-0000-7000-8000-00000000a002'
const NOW = new Date('2026-10-19T12:00:00Z')

describe('refuseSelf', () => {
  it('refuses an action on the acting admin', () => {
    expect(refuseSelf(ACTOR, ACTOR)).toEqual({ ok: false, error: { code: 'forbidden' } })
  })

  it('lets an action on someone else through', () => {
    expect(refuseSelf(ACTOR, OTHER)).toEqual({ ok: true, value: undefined })
  })
})

describe('planStatusChange', () => {
  it('disables an active admin now', () => {
    expect(planStatusChange('disable', { disabledAt: null }, NOW)).toEqual({ ok: true, value: { disabledAt: NOW } })
  })

  it('refuses to disable someone already disabled (keeps the original date)', () => {
    expect(planStatusChange('disable', { disabledAt: new Date('2026-10-01T00:00:00Z') }, NOW)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
  })

  it('reactivates a disabled admin', () => {
    expect(planStatusChange('reactivate', { disabledAt: new Date('2026-10-01T00:00:00Z') }, NOW)).toEqual({ ok: true, value: { disabledAt: null } })
  })

  it('refuses to reactivate someone active', () => {
    expect(planStatusChange('reactivate', { disabledAt: null }, NOW)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
  })
})
