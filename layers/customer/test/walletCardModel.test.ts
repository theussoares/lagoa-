import { describe, expect, it } from 'vitest'
import { WalletCardSchema } from '#shared/schemas/loyaltyCard'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { Translate } from '#layers/core/app/utils/translate'
import { toStampCardModel } from '../app/utils/walletCardModel'

/** Devolve a chave e os parâmetros: o teste vê o que a tela pediria ao pt-BR.json. */
const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function card(overrides: Partial<WalletCard>): WalletCard {
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

const options = { t, seenBalance: 8, formatDate: (iso: string) => iso.slice(0, 10) }

describe('toStampCardModel', () => {
  it('draws one slot per stamp of the target, with the reward on the last one', () => {
    const model = toStampCardModel(card({}), options)
    if (model.body.kind !== 'slots') throw new Error('expected slots')
    expect(model.body.slots).toHaveLength(10)
    expect(model.body.slots.filter((slot) => slot.stamped)).toHaveLength(8)
    expect(model.body.slots.at(-1)?.isRewardSlot).toBe(true)
    expect(model.progress).toBe('08/10')
  })

  it('presses only the stamps that arrived since the last visit, one after another', () => {
    const model = toStampCardModel(card({}), { ...options, seenBalance: 6 })
    if (model.body.kind !== 'slots') throw new Error('expected slots')
    const fresh = model.body.slots.filter((slot) => slot.fresh)
    expect(fresh.map((slot) => [slot.number, slot.delayMs])).toEqual([
      [7, 0],
      [8, 70],
    ])
  })

  it('keeps each stamp tilt stable and within ±6°', () => {
    const first = toStampCardModel(card({}), options)
    const again = toStampCardModel(card({}), options)
    expect(first.body).toEqual(again.body)
    if (first.body.kind !== 'slots') throw new Error('expected slots')
    for (const slot of first.body.slots) expect(Math.abs(slot.tilt)).toBeLessThanOrEqual(6)
  })

  it('says what is left with the count apart, so it can be set large', () => {
    const model = toStampCardModel(card({}), options)
    expect(model.status).toEqual({
      kind: 'remaining',
      count: '2',
      unitLine: 'wallet.card.unitsFor.stamp #2',
      reward: 'Corte grátis',
    })
    expect(model.rewardReady).toBe(false)
  })

  it('turns a points card into a ruler', () => {
    const model = toStampCardModel(card({ unit: 'point', balance: 96, target: 150 }), options)
    expect(model.body).toMatchObject({ kind: 'ruler', balance: 96, target: 150 })
    expect(model.progress).toBe('096/150')
  })

  it('marks a ready reward and presses the red seal only the first time it is seen', () => {
    const ready = card({ balance: 10, rewardExpiresAt: '2026-10-31T12:00:00.000Z' })
    const firstTime = toStampCardModel(ready, options)
    const seenBefore = toStampCardModel(ready, { ...options, seenBalance: 10 })
    expect(firstTime.status).toMatchObject({ kind: 'ready', fresh: true, note: 'wallet.card.heldUntil date=2026-10-31' })
    expect(seenBefore.status).toMatchObject({ kind: 'ready', fresh: false })
    expect(firstTime.rewardReady).toBe(true)
  })
})
