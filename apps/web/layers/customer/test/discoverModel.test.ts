import { describe, expect, it } from 'vitest'
import { ChallengeSchema } from '#shared/schemas/discover'
import { ShopSummarySchema } from '#shared/schemas/shop'
import type { ShopSummary } from '#shared/schemas/shop'
import type { Translate } from '#layers/core/app/utils/translate'
import {
  groupShops,
  pendingChallengeShopIds,
  toChallengeModel,
  toShopTeaserModel,
} from '../app/utils/discoverModel'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function shop(id: string, program: Partial<ShopSummary['program']> = {}): ShopSummary {
  return ShopSummarySchema.parse({
    id,
    name: `Loja ${id}`,
    category: 'bakery',
    neighborhood: 'Centro',
    addressLine: 'Endereço de exemplo, Centro',
    program: { unit: 'stamp', target: 10, rewardTitle: 'Pão de queijo', earnRate: { per: 'visit', units: 1 }, welcomeUnits: 2, ...program },
  })
}

const challenge = ChallengeSchema.parse({
  id: 'challenge_1',
  title: 'Conheça 3 lojas',
  description: 'Uma visita em cada.',
  shopIds: ['shop_a', 'shop_b', 'shop_c'],
  requiredVisits: 3,
  visitedShopIds: ['shop_a'],
  startsAt: '2026-09-21T12:00:00.000Z',
  endsAt: '2026-10-21T12:00:00.000Z',
})

describe('groupShops', () => {
  it('separates shops without a card from the ones already in the wallet', () => {
    const groups = groupShops([shop('shop_a'), shop('shop_b')], new Set(['shop_b']))
    expect(groups.fresh.map((item) => item.id)).toEqual(['shop_a'])
    expect(groups.known.map((item) => item.id)).toEqual(['shop_b'])
  })
})

describe('pendingChallengeShopIds', () => {
  it('lists only shops still missing in an open challenge', () => {
    expect([...pendingChallengeShopIds([challenge])]).toEqual(['shop_b', 'shop_c'])
  })

  it('drops every shop once the challenge is complete', () => {
    const done = { ...challenge, visitedShopIds: challenge.shopIds }
    expect(pendingChallengeShopIds([done]).size).toBe(0)
  })
})

describe('toShopTeaserModel', () => {
  it('shows the blank card with the welcome stamps already in', () => {
    const model = toShopTeaserModel(shop('shop_b'), new Set(['shop_b']), t)
    expect(model.preview).toEqual({ kind: 'slots', total: 10, welcome: 2 })
    expect(model.tag).toBe('discover.challengeTag')
    expect(model.earn).toBe('discover.earn.visit units=units.stamp #1')
  })

  it('uses a ruler for points and has no welcome line when the bonus is off', () => {
    const model = toShopTeaserModel(
      shop('shop_c', { unit: 'point', target: 150, earnRate: { per: 'real', units: 1 }, welcomeUnits: 0 }),
      new Set(),
      t,
    )
    expect(model.preview).toEqual({ kind: 'ruler', fraction: 0 })
    expect(model.welcome).toBeNull()
    expect(model.tag).toBeNull()
    expect(model.earn).toBe('discover.earn.real units=units.point #1')
  })
})

describe('toChallengeModel', () => {
  it('marks visited shops and counts progress', () => {
    const byId = new Map([shop('shop_a'), shop('shop_b'), shop('shop_c')].map((item) => [item.id, item]))
    const model = toChallengeModel(challenge, byId, t, (iso) => iso.slice(0, 10))
    expect(model.stops.map((stop) => stop.visited)).toEqual([true, false, false])
    expect(model).toMatchObject({ done: false, progress: 'discover.challenge.progress done=1 total=3' })
    expect(model.deadline).toBe('discover.challenge.deadline date=2026-10-21')
  })
})
