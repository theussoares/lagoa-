import { describe, expect, it } from 'vitest'
import { CustomerIdSchema, LoyaltyCardIdSchema, ProgramIdSchema, ShopIdSchema } from '../schemas/ids'
import type { LoyaltyCard } from '../schemas/loyaltyCard'
import { addUnits, consumeReward, isNearReward, isRewardReady, remainingUnits, sortByRewardProximity } from './loyaltyCard'

const card: LoyaltyCard = {
  id: LoyaltyCardIdSchema.parse('card_1'),
  shopId: ShopIdSchema.parse('shop_1'),
  customerId: CustomerIdSchema.parse('cus_1'),
  programId: ProgramIdSchema.parse('prog_1'),
  unit: 'stamp',
  balance: 0,
  target: 10,
  rewardTitle: 'Corte grátis',
  stamps: [],
  lastVisitAt: null,
  rewardExpiresAt: null,
}

describe('loyalty card', () => {
  it('numbers stamps in sequence', () => {
    const next = addUnits(addUnits(card, 2, 'welcomeBonus', '2026-10-01T10:00:00Z'), 1, 'counter', '2026-10-01T11:00:00Z')
    expect(next.stamps.map((stamp) => [stamp.number, stamp.source])).toEqual([
      [1, 'welcomeBonus'],
      [2, 'welcomeBonus'],
      [3, 'counter'],
    ])
    expect(remainingUnits(next)).toBe(7)
  })

  it('keeps the overflow after consuming the reward', () => {
    const full = addUnits(card, 11, 'counter', '2026-10-01T10:00:00Z')
    expect(isRewardReady(full)).toBe(true)
    const next = consumeReward(full)
    expect(next.balance).toBe(1)
    expect(next.stamps.map((stamp) => stamp.number)).toEqual([1])
  })

  it('sorts ready rewards first, then by proportional distance', () => {
    const sorted = sortByRewardProximity([
      { balance: 2, target: 10 },
      { balance: 8, target: 8 },
      { balance: 96, target: 150 },
      { balance: 8, target: 10 },
    ])
    expect(sorted).toEqual([
      { balance: 8, target: 8 },
      { balance: 8, target: 10 },
      { balance: 96, target: 150 },
      { balance: 2, target: 10 },
    ])
  })

  it('determines if card is near reward (>= 80% and < target)', () => {
    // Carimbos: meta 5
    expect(isNearReward({ balance: 3, target: 5 })).toBe(false) // 60%
    expect(isNearReward({ balance: 4, target: 5 })).toBe(true)  // 80%
    expect(isNearReward({ balance: 5, target: 5 })).toBe(false) // 100% (já está liberado, não apenas perto)

    // Carimbos: meta 10
    expect(isNearReward({ balance: 7, target: 10 })).toBe(false) // 70%
    expect(isNearReward({ balance: 8, target: 10 })).toBe(true)  // 80%
    expect(isNearReward({ balance: 9, target: 10 })).toBe(true)  // 90%
    expect(isNearReward({ balance: 10, target: 10 })).toBe(false)

    // Pontos: meta 100
    expect(isNearReward({ balance: 79, target: 100 })).toBe(false)
    expect(isNearReward({ balance: 80, target: 100 })).toBe(true)
    expect(isNearReward({ balance: 95, target: 100 })).toBe(true)
    expect(isNearReward({ balance: 100, target: 100 })).toBe(false)
  })
})
