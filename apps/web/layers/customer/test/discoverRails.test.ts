import { describe, expect, it } from 'vitest'
import { ShopSummarySchema } from '#shared/schemas/shop'
import type { ShopCategory, ShopSummary } from '#shared/schemas/shop'
import type { Translate } from '#layers/core/app/types/i18n'
import { buildDiscoverRails, toDiscoverRailModels, toShopRailCardModel } from '../app/utils/discoverRails'

const t: Translate = (key, named = {}) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`)].join(' ')

interface ShopOptions {
  category?: ShopCategory
  welcomeUnits?: number
  surpriseDayToday?: boolean
}

function shop(id: string, options: ShopOptions = {}): ShopSummary {
  return ShopSummarySchema.parse({
    id,
    name: `Loja ${id}`,
    category: options.category ?? 'bakery',
    neighborhood: 'Centro',
    addressLine: 'Endereço de exemplo, Centro',
    program: {
      unit: 'stamp',
      target: 10,
      rewardTitle: 'Pão de queijo',
      earnRate: { per: 'visit', units: 1 },
      welcomeUnits: options.welcomeUnits ?? 0,
    },
    surpriseDayToday: options.surpriseDayToday ?? false,
  })
}

const ids = (shops: readonly ShopSummary[]): string[] => shops.map((item) => item.id)

const noCards: ReadonlySet<string> = new Set()

describe('buildDiscoverRails', () => {
  it('puts a shop in one rail only: surprise day first, then welcome, then the rest', () => {
    const rails = buildDiscoverRails(
      [
        shop('both', { surpriseDayToday: true, welcomeUnits: 2 }),
        shop('welcome', { welcomeUnits: 2 }),
        shop('surprise', { surpriseDayToday: true }),
        shop('plain'),
      ],
      null,
      noCards,
    )
    expect(ids(rails.surpriseDay)).toEqual(['both', 'surprise'])
    expect(ids(rails.welcome)).toEqual(['welcome'])
    expect(ids(rails.others)).toEqual(['plain'])
    expect(ids(rails.known)).toEqual([])
  })

  it('keeps wallet shops out of welcome and the rest, but in surprise day and always in known', () => {
    const rails = buildDiscoverRails(
      [shop('surprise', { surpriseDayToday: true }), shop('welcome', { welcomeUnits: 2 }), shop('plain')],
      null,
      new Set(['surprise', 'welcome', 'plain']),
    )
    expect(ids(rails.surpriseDay)).toEqual(['surprise'])
    expect(ids(rails.welcome)).toEqual([])
    expect(ids(rails.others)).toEqual([])
    expect(ids(rails.known)).toEqual(['surprise', 'welcome', 'plain'])
  })

  it('keeps only the shops of the chosen group', () => {
    const rails = buildDiscoverRails(
      [shop('cafe', { category: 'cafe', surpriseDayToday: true }), shop('barber', { category: 'barbershop', welcomeUnits: 2 }), shop('gym', { category: 'gym' })],
      'beauty',
      new Set(['cafe']),
    )
    expect(ids(rails.surpriseDay)).toEqual([])
    expect(ids(rails.welcome)).toEqual(['barber'])
    expect(ids(rails.others)).toEqual([])
    expect(ids(rails.known)).toEqual([])
  })

  it('leaves every rail empty when no shop is of the chosen group', () => {
    const rails = buildDiscoverRails([shop('a', { surpriseDayToday: true }), shop('b', { welcomeUnits: 2 }), shop('c')], 'pet', new Set(['c']))
    expect(rails).toEqual({ surpriseDay: [], welcome: [], others: [], known: [] })
  })
})

describe('toShopRailCardModel', () => {
  it('shows the group and neighborhood, and the seal of the strongest perk', () => {
    const card = toShopRailCardModel(shop('a', { category: 'cafe', surpriseDayToday: true, welcomeUnits: 2 }), t)
    expect(card.meta).toBe('discover.groups.food · Centro')
    expect(card.seal).toBe('discover.rails.surpriseDaySeal')
    expect(card.badge).toBeNull()
  })

  it('shows the welcome seal with the units, and no seal without a perk', () => {
    expect(toShopRailCardModel(shop('a', { welcomeUnits: 3 }), t).seal).toBe('discover.rails.welcomeSeal count=3')
    expect(toShopRailCardModel(shop('b'), t).seal).toBeNull()
  })

  it('carries the featured badge on every featured card, and links like the shop tile', () => {
    expect(toShopRailCardModel(shop('a'), t, { featured: true }).badge).toBe('discover.featuredBadge')
    expect(toShopRailCardModel(shop('b'), t).badge).toBeNull()
    expect(toShopRailCardModel(shop('b'), t).to).toBe('/carteira')
  })
})

describe('toDiscoverRailModels', () => {
  it('keeps the screen order and drops an empty rail', () => {
    const rails = buildDiscoverRails([shop('welcome', { welcomeUnits: 2 }), shop('plain')], null, noCards)
    const models = toDiscoverRailModels(rails, t)
    expect(models.map((rail) => [rail.id, rail.title, rail.cards.map((card) => card.id)])).toEqual([['welcome', 'discover.rails.welcome', ['welcome']]])
  })
})
