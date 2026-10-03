import { describe, expect, it } from 'vitest'
import { CounterEntrySchema, VisitRegisteredSchema } from '#shared/schemas/visit'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import type { Translate } from '#layers/core/app/types/i18n'
import { amountDigits, counterActionFor } from '../app/utils/counterAction'
import { RedemptionPreviewSchema } from '#shared/schemas/redemption'
import { toCounterLedgerModel, toLaunchFormText, toLaunchReceipt, toRedemptionPreviewModel } from '../app/utils/counterModels'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function entry(overrides: Partial<CounterEntry>): CounterEntry {
  return CounterEntrySchema.parse({
    id: 'visit_1',
    shopId: 'shop_barbearia',
    maskedPhone: '(67) 9••••-0374',
    kind: 'visit',
    unit: 'stamp',
    units: 1,
    amountCents: null,
    rewardTitle: null,
    isNewCustomer: false,
    createdAt: '2026-10-01T17:32:00.000Z',
    ...overrides,
  })
}

function registered(card: { balance: number; target: number; unit?: 'stamp' | 'point'; rewardReady?: boolean }, extra: { unitsEarned?: number; welcomeUnits?: number; isNew?: boolean } = {}): VisitRegistered {
  return VisitRegisteredSchema.parse({
    entry: entry({ isNewCustomer: extra.isNew ?? false }),
    card: { cardId: 'card_1', unit: card.unit ?? 'stamp', balance: card.balance, target: card.target, rewardReady: card.rewardReady ?? false },
    unitsEarned: extra.unitsEarned ?? 1,
    welcomeUnits: extra.welcomeUnits ?? 0,
  })
}

describe('counterActionFor', () => {
  it('gives one stamp per visit on a stamp card', () => {
    expect(counterActionFor({ mode: 'stamps', target: 10 })).toEqual({ kind: 'visit', unit: 'stamp', units: 1 })
  })

  it('gives the configured points per visit', () => {
    expect(counterActionFor({ mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 })).toEqual({ kind: 'visit', unit: 'point', units: 10 })
  })

  it('asks for the purchase amount on points per real', () => {
    expect(counterActionFor({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 150 })).toEqual({ kind: 'amount', pointsPerReal: 1 })
  })
})

describe('amountDigits', () => {
  it('keeps only digits, without leading zeros, entering through the cents', () => {
    expect(amountDigits('R$ 0,24a9')).toBe('249')
    expect(amountDigits('123456789')).toBe('1234567')
  })
})

describe('toCounterLedgerModel', () => {
  it('shows only the masked phone and the earned units', () => {
    const model = toCounterLedgerModel(entry({}), t, false)
    expect(model.phone).toBe('(67) 9••••-0374')
    expect(model.action).toBe('counter.ledger.earned units=units.stamp count=1 #1')
    expect(model.tone).toBe('ink')
    expect(model.time).toBe('13:32')
  })

  it('marks redemptions in reward tone and new customers with a badge', () => {
    const redemption = toCounterLedgerModel(entry({ kind: 'redemption', units: 0, rewardTitle: 'Corte grátis' }), t, true)
    expect(redemption.tone).toBe('reward')
    expect(redemption.action).toBe('counter.ledger.redeemed reward=Corte grátis')
    expect(redemption.fresh).toBe(true)
    expect(toCounterLedgerModel(entry({ isNewCustomer: true }), t, false).badge).toBe('counter.ledger.newCustomer')
  })
})

describe('toLaunchReceipt', () => {
  it('presses only the stamps earned now', () => {
    const receipt = toLaunchReceipt(registered({ balance: 7, target: 10 }), 'Corte grátis', t)
    expect(receipt.body.kind).toBe('slots')
    if (receipt.body.kind !== 'slots') return
    expect(receipt.body.slots.filter((slot) => slot.stamped)).toHaveLength(7)
    expect(receipt.body.slots.filter((slot) => slot.fresh && slot.stamped).map((slot) => slot.number)).toEqual([7])
  })

  it('presses the welcome stamps too on a new card', () => {
    const receipt = toLaunchReceipt(registered({ balance: 3, target: 10 }, { welcomeUnits: 2, isNew: true }), 'Corte grátis', t)
    expect(receipt.title).toContain('counter.receipt.newCard')
    expect(receipt.detail).toContain('counter.receipt.welcome')
    if (receipt.body.kind !== 'slots') throw new Error('expected slots')
    expect(receipt.body.slots.filter((slot) => slot.fresh && slot.stamped).map((slot) => slot.number)).toEqual([1, 2, 3])
  })

  it('switches to the reward tone when the card completes', () => {
    const receipt = toLaunchReceipt(registered({ balance: 10, target: 10, rewardReady: true }), 'Corte grátis', t)
    expect(receipt.tone).toBe('reward')
    expect(receipt.title).toBe('counter.receipt.rewardReady reward=Corte grátis')
  })

  it('uses the ruler for points', () => {
    const receipt = toLaunchReceipt(registered({ balance: 40, target: 150, unit: 'point' }, { unitsEarned: 24 }), 'Café', t)
    expect(receipt.body.kind).toBe('ruler')
  })
})

describe('toLaunchFormText', () => {
  it('gives one stamp while the program is not loaded', () => {
    expect(toLaunchFormText(null, t)).toEqual({
      submitLabel: 'counter.launch.give units=units.stamp count=1 #1',
      amountHint: undefined,
    })
  })

  it('names the units of a visit action', () => {
    const text = toLaunchFormText({ kind: 'visit', unit: 'point', units: 5 }, t)
    expect(text.submitLabel).toBe('counter.launch.give units=units.point count=5 #5')
    expect(text.amountHint).toBeUndefined()
  })

  it('asks for the amount and explains the exchange rate in amount mode', () => {
    const text = toLaunchFormText({ kind: 'amount', pointsPerReal: 2 }, t)
    expect(text.submitLabel).toBe('counter.launch.giveAmount')
    expect(text.amountHint).toBe('counter.launch.amountHint points=units.point count=2 #2')
  })
})

describe('toRedemptionPreviewModel', () => {
  const preview = RedemptionPreviewSchema.parse({
    redemptionId: 'redemption_1',
    rewardTitle: 'Corte grátis',
    maskedPhone: '(67) 9••••-0374',
    expiresAt: '2026-10-01T17:32:00.000Z',
  })

  it('builds the customer line only from the masked phone and the expiry time', () => {
    const model = toRedemptionPreviewModel(preview, false, t)
    expect(model.rewardTitle).toBe('Corte grátis')
    expect(model.customerLine).toContain('phone=(67) 9••••-0374')
    expect(model.customerLine).toMatch(/time=\d{2}:\d{2}/)
    expect(model.confirming).toBe(false)
  })

  it('flags the delivery in progress', () => {
    expect(toRedemptionPreviewModel(preview, true, t).confirming).toBe(true)
  })
})
