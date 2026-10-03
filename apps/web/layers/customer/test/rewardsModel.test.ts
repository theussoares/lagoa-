import { describe, expect, it } from 'vitest'
import { WalletCardSchema } from '#shared/schemas/loyaltyCard'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { Translate } from '#layers/core/app/utils/translate'
import { closestRewardLine, groupRewards, toReadyRewardModel, toUpcomingRewardModel } from '../app/utils/rewardsModel'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function card(overrides: Partial<Omit<WalletCard, 'id'>> & { id?: string }): WalletCard {
  return WalletCardSchema.parse({
    id: 'card_1',
    shopId: 'shop_barbearia',
    programId: 'prog_shop_barbearia',
    unit: 'stamp',
    balance: 8,
    target: 10,
    rewardTitle: 'Corte grátis',
    stamps: [],
    lastVisitAt: null,
    rewardExpiresAt: null,
    shop: {
      id: 'shop_barbearia',
      name: 'Barbearia Navalha',
      category: 'barbershop',
      neighborhood: 'Centro',
      addressLine: 'Endereço de exemplo, Centro',
      program: { unit: 'stamp', target: 10, rewardTitle: 'Corte grátis', earnRate: { per: 'visit', units: 1 }, welcomeUnits: 2 },
    },
    ...overrides,
  })
}

describe('groupRewards', () => {
  it('splits ready rewards from the ones still on the way, keeping the wallet order', () => {
    const cards = [card({ id: 'ready', balance: 10 }), card({ id: 'near', balance: 9 }), card({ id: 'far', balance: 1 })]
    const groups = groupRewards(cards)
    expect(groups.ready.map((item) => item.id)).toEqual(['ready'])
    expect(groups.upcoming.map((item) => item.id)).toEqual(['near', 'far'])
  })
})

describe('toReadyRewardModel', () => {
  it('links to the redemption screen and says how long the reward is held', () => {
    const model = toReadyRewardModel(card({ balance: 10, rewardExpiresAt: '2026-10-28T12:00:00.000Z' }), t, (iso) => iso.slice(0, 10))
    expect(model).toMatchObject({ to: '/premios/card_1', reward: 'Corte grátis', note: 'wallet.card.heldUntil date=2026-10-28' })
  })

  it('has no note when the reward has no hold date', () => {
    expect(toReadyRewardModel(card({ balance: 10 }), t, String).note).toBeNull()
  })
})

describe('toUpcomingRewardModel', () => {
  it('shows what is missing and how far the card got', () => {
    const model = toUpcomingRewardModel(card({ balance: 8 }), t)
    expect(model).toMatchObject({ count: '2', countLabel: 'rewards.remainingLabel #2', progress: { kind: 'slots', filled: 8, total: 10 } })
    expect(model.progressLabel).toContain('balance=8 target=10')
  })

  it('never fills more slots than the card has', () => {
    expect(toUpcomingRewardModel(card({ balance: 12 }), t).progress).toEqual({ kind: 'slots', filled: 10, total: 10 })
  })

  it('draws points on a ruler instead of slots', () => {
    const model = toUpcomingRewardModel(card({ unit: 'point', balance: 96, target: 150 }), t)
    expect(model.progress).toEqual({ kind: 'ruler', fraction: 0.64 })
  })
})

describe('closestRewardLine', () => {
  it('names the shop, the units left and the reward', () => {
    expect(closestRewardLine(card({ balance: 9 }), t)).toBe(
      'rewards.closest units=units.stamp #1 reward=Corte grátis shop=Barbearia Navalha #1',
    )
  })
})
