import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { ledgerEntries, loyaltyCards, redemptions } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase, type TestShop } from '../../test-support/test-database'
import { DrizzleCheckInRepository } from '../check-in/drizzle-check-in.repository'
import { CheckInService } from '../check-in/check-in.service'
import { DrizzleWalletRepository } from '../wallet/drizzle-wallet.repository'
import { WalletService } from '../wallet/wallet.service'
import { DrizzleRedemptionRepository } from './drizzle-redemption.repository'
import { RedemptionService } from './redemption.service'

const SLOW = 30_000
const WELCOME_BONUS = { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } }
const NOW = () => new Date()

/** Contra Postgres de verdade: unicidade do código ativo, vencimento e entrega com débito no ledger. */
describe.skipIf(!TEST_DATABASE_URL)('redemption against a real database', () => {
  let data: TestDatabase
  let service: RedemptionService
  let checkIn: CheckInService
  let wallet: WalletService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new RedemptionService(new DrizzleRedemptionRepository(data.db), new SystemClock())
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock())
    wallet = new WalletService(new DrizzleWalletRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' })
  })

  afterAll(async () => data.close())

  /** Cartão de 3 carimbos que já nasce pronto: 2 de boas-vindas + 1 do check-in. */
  async function readyCard(options: { restartWelcome?: boolean } = {}): Promise<{ customer: string; shop: TestShop; cardId: string }> {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 }, bonusRules: options.restartWelcome === false ? NO_BONUS_RULES : WELCOME_BONUS })
    const customer = await data.createCustomer()
    if (options.restartWelcome === false) {
      // sem boas-vindas o cartão precisa de mais visitas: preenche direto, como o Balcão faria
      await data.db.transaction(async (tx) => {
        const { card } = await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: customer, programId: shop.programId })
        await ledger.credit(tx, { card, shopId: shop.id, customerId: customer, kind: 'visit', now: NOW(), idempotencyKey: `fill-${customer}`, plan: { welcomeUnits: 0, units: 3, appliedBonuses: [], balanceAfter: 3, rewardExpiresAt: null } })
      })
    } else {
      await checkIn.checkIn(customer, shop.checkInCode)
    }
    const [card] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customer))
    if (!card) throw new Error('card expected')
    return { customer, shop, cardId: card.id }
  }

  it('creates a code and gives the same one back while it is valid', async () => {
    const { customer, cardId } = await readyCard()
    const first = await service.requestCode(customer, cardId)
    expect(first).toMatchObject({ ok: true, value: { status: 'active', rewardTitle: 'Prêmio de teste', cardId } })
    const again = await service.requestCode(customer, cardId)
    expect(again.ok && first.ok && again.value.id === first.value.id && again.value.code === first.value.code).toBe(true)
  }, SLOW)

  it('leaves exactly one active code when many requests arrive together', async () => {
    const { customer, cardId } = await readyCard()
    const results = await Promise.all(Array.from({ length: 6 }, () => service.requestCode(customer, cardId)))
    expect(results.every((r) => r.ok)).toBe(true)
    expect(new Set(results.map((r) => (r.ok ? r.value.id : ''))).size).toBe(1)
    expect(await data.db.select().from(redemptions).where(eq(redemptions.cardId, cardId))).toHaveLength(1)
  }, SLOW)

  it('refuses a card that is not ready and a card that is not the customer’s', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 }, bonusRules: WELCOME_BONUS })
    const customer = await data.createCustomer()
    await checkIn.checkIn(customer, shop.checkInCode) // 3 de 10
    const [card] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customer))
    expect(await service.requestCode(customer, card?.id ?? '')).toEqual({ ok: false, error: { code: 'rewardNotReady', remaining: 7 } })
    const stranger = await data.createCustomer()
    expect(await service.requestCode(stranger, card?.id ?? '')).toEqual({ ok: false, error: { code: 'notFound', entity: 'card' } })
  }, SLOW)

  it('retires an expired code and issues a new one', async () => {
    const { customer, cardId } = await readyCard()
    const first = await service.requestCode(customer, cardId)
    await data.db.update(redemptions).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(redemptions.cardId, cardId))
    const second = await service.requestCode(customer, cardId)
    expect(first.ok && second.ok && first.value.id !== second.value.id).toBe(true)
    const rows = await data.db.select().from(redemptions).where(eq(redemptions.cardId, cardId))
    expect(rows.map((r) => r.status).sort()).toEqual(['active', 'expired'])
  }, SLOW)

  it('reads a code only for its owner and reports it expired once it lapsed', async () => {
    const { customer, cardId } = await readyCard()
    const created = await service.requestCode(customer, cardId)
    if (!created.ok) throw new Error('expected a code')
    expect(await service.get(customer, created.value.id)).toMatchObject({ ok: true, value: { status: 'active' } })
    expect(await service.get(await data.createCustomer(), created.value.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'redemption' } })
    await data.db.update(redemptions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(redemptions.id, created.value.id))
    expect(await service.get(customer, created.value.id)).toMatchObject({ ok: true, value: { status: 'expired' } })
    const [row] = await data.db.select().from(redemptions).where(eq(redemptions.id, created.value.id))
    expect(row?.status).toBe('expired')
  }, SLOW)

  it('settles at the counter: debits the target, restarts the card with the welcome units, shows in the reward history', async () => {
    const { customer, shop, cardId } = await readyCard()
    const created = await service.requestCode(customer, cardId)
    if (!created.ok) throw new Error('expected a code')
    const owner = await data.createCustomer({ withProfile: false })
    const settled = await data.db.transaction((tx) => ledger.settleRedemption(tx, { redemptionId: created.value.id, shopId: shop.id, recordedBy: owner, now: new Date() }))
    expect(settled).toEqual({ ok: true, value: { cardId, customerId: customer, target: 3, balanceAfter: 2, welcomeUnits: 2 } })

    const [card] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.id, cardId))
    expect(card).toMatchObject({ balance: 2, rewardExpiresAt: null })
    expect(await service.get(customer, created.value.id)).toMatchObject({ ok: true, value: { status: 'redeemed' } })
    const history = await wallet.listRewardHistory(customer, 10)
    expect(history).toMatchObject({ ok: true, value: [{ kind: 'redemption', units: 0, rewardTitle: 'Prêmio de teste' }] })
    const rows = await data.db.select({ kind: ledgerEntries.kind, units: ledgerEntries.unitsDelta }).from(ledgerEntries).where(eq(ledgerEntries.customerId, customer)).orderBy(ledgerEntries.id)
    expect(rows).toEqual([{ kind: 'welcomeBonus', units: 2 }, { kind: 'checkIn', units: 1 }, { kind: 'redemption', units: -3 }, { kind: 'welcomeBonus', units: 2 }])
  }, SLOW)

  it('never settles the same code twice, nor a code from another shop, nor an expired one', async () => {
    const { customer, shop, cardId } = await readyCard({ restartWelcome: false })
    const created = await service.requestCode(customer, cardId)
    if (!created.ok) throw new Error('expected a code')
    const owner = await data.createCustomer({ withProfile: false })
    const settle = (shopId: string) => data.db.transaction((tx) => ledger.settleRedemption(tx, { redemptionId: created.value.id, shopId, recordedBy: owner, now: new Date() }))

    const otherShop = await data.createShop()
    expect(await settle(otherShop.id)).toEqual({ ok: false, error: { code: 'redemptionInvalid' } })
    expect(await settle(shop.id)).toMatchObject({ ok: true, value: { balanceAfter: 0, welcomeUnits: 0 } })
    expect(await settle(shop.id)).toEqual({ ok: false, error: { code: 'redemptionAlreadyUsed' } })
    expect((await data.db.select().from(ledgerEntries).where(eq(ledgerEntries.customerId, customer))).filter((e) => e.kind === 'redemption')).toHaveLength(1)

    const lapsed = await readyCard({ restartWelcome: false })
    const old = await service.requestCode(lapsed.customer, lapsed.cardId)
    if (!old.ok) throw new Error('expected a code')
    await data.db.update(redemptions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(redemptions.id, old.value.id))
    const result = await data.db.transaction((tx) => ledger.settleRedemption(tx, { redemptionId: old.value.id, shopId: lapsed.shop.id, recordedBy: owner, now: new Date() }))
    expect(result).toEqual({ ok: false, error: { code: 'redemptionExpired' } })
  }, SLOW)
})
