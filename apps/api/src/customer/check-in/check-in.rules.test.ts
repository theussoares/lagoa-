import { describe, expect, it } from 'vitest'
import { catalogShop, NO_BONUS } from '../../shops/catalog.fixtures'
import { checkInShop, FIRST_VISIT, stateOf } from './check-in.fixtures'
import { decideCheckIn } from './check-in.rules'
import type { CheckInState } from './check-in.repository'

const now = new Date('2026-10-03T12:00:00Z')
const firstVisit: CheckInState = FIRST_VISIT

describe('decideCheckIn', () => {
  it('lets a first check-in through with the welcome units', () => {
    const shop = checkInShop({
      shop: catalogShop({ program: { ...catalogShop().program, bonusRules: { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } } } }),
    })
    expect(decideCheckIn(shop, firstVisit, now)).toMatchObject({ ok: true, value: { welcomeUnits: 2, units: 1, balanceAfter: 3 } })
  })

  it('holds a second check-in inside the window and says when it opens', () => {
    const state: CheckInState = stateOf({ balance: 2, lastVisitAt: new Date('2026-10-03T10:00:00Z') })
    expect(decideCheckIn(checkInShop({ cooldownHours: 4 }), state, now)).toEqual({
      ok: false,
      error: { code: 'checkInCooldown', availableAt: '2026-10-03T14:00:00.000Z' },
    })
  })

  it('lets it through again once the window has passed', () => {
    const state: CheckInState = stateOf({ balance: 2, lastVisitAt: new Date('2026-10-02T11:00:00Z') })
    expect(decideCheckIn(checkInShop(), state, now)).toMatchObject({ ok: true, value: { balanceAfter: 3 } })
  })

  it('doubles the visit on the customer birthday', () => {
    const shop = checkInShop({
      shop: catalogShop({ program: { ...catalogShop().program, bonusRules: { ...NO_BONUS, birthdayMultiplier: { enabled: true, multiplier: 2 } } } }),
    })
    expect(decideCheckIn(shop, { ...FIRST_VISIT, birthday: '10-03' }, now)).toMatchObject({ ok: true, value: { units: 2 } })
  })

  it('refuses a club that only earns by amount: there is no amount to read in a check-in', () => {
    const shop = checkInShop({
      shop: catalogShop({ program: { ...catalogShop().program, rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 } } }),
    })
    expect(decideCheckIn(shop, firstVisit, now)).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
  })
})
