import { describe, expect, it } from 'vitest'
import { CARD_ID, joinableShop } from './shop-join.fixtures'
import { decideShopJoin } from './shop-join.rules'

describe('decideShopJoin', () => {
  it('lets a new customer join a shop that accepts it', () => {
    expect(decideShopJoin(joinableShop(), null)).toEqual({ ok: true, value: 'join' })
  })

  it('refuses a new customer when the shop turned joining off', () => {
    expect(decideShopJoin(joinableShop({ joinEnabled: false }), null)).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
  })

  it.each([true, false])('answers alreadyMember for an existing card, even with joining %s', (joinEnabled) => {
    expect(decideShopJoin(joinableShop({ joinEnabled }), CARD_ID)).toEqual({ ok: true, value: 'alreadyMember' })
  })
})
