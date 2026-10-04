import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { shops } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { DrizzleReferralSettlement } from '../../ledger/drizzle-referral-settlement'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { CheckInService } from '../check-in/check-in.service'
import { DrizzleCheckInRepository } from '../check-in/drizzle-check-in.repository'
import { DrizzleWalletRepository } from './drizzle-wallet.repository'
import { WalletService } from './wallet.service'

const SLOW = 30_000
const WELCOME = { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } }

describe.skipIf(!TEST_DATABASE_URL)('wallet against a real database', () => {
  let data: TestDatabase
  let checkIn: CheckInService
  let wallet: WalletService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    const ledger = new LedgerStore()
    const clock = new SystemClock()
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), clock, new DrizzleReferralSettlement(data.db, ledger))
    wallet = new WalletService(new DrizzleWalletRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' }, clock)
  })

  afterAll(async () => data.close())

  it('lists the customer cards closest to the reward first, with stamps from the ledger', async () => {
    const [far, near] = [await data.createShop({ bonusRules: NO_BONUS_RULES, rules: { mode: 'stamps', target: 10 } }), await data.createShop({ bonusRules: WELCOME, rules: { mode: 'stamps', target: 4 } })]
    const customer = await data.createCustomer()
    await checkIn.checkIn(customer, far.checkInCode)
    await checkIn.checkIn(customer, near.checkInCode)
    const cards = await wallet.listCards(customer)
    expect(cards.ok && cards.value.map((c) => c.shopId)).toEqual([near.id, far.id]) // 3/4 antes de 1/10
    expect(cards.ok && cards.value[0]?.stamps.map((s) => s.source)).toEqual(['welcomeBonus', 'welcomeBonus', 'checkIn'])
  }, SLOW)

  it('never shows another customer’s cards or activity', async () => {
    const shop = await data.createShop()
    const [mine, theirs] = [await data.createCustomer(), await data.createCustomer()]
    await checkIn.checkIn(theirs, shop.checkInCode)
    expect(await wallet.listCards(mine)).toEqual({ ok: true, value: [] })
    expect(await wallet.getCard(mine, shop.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'card' } })
    expect(await wallet.listActivity(mine, 10)).toEqual({ ok: true, value: [] })
  }, SLOW)

  it('hides the card of a shop that is no longer approved, but keeps the history', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer()
    await checkIn.checkIn(customer, shop.checkInCode)
    await data.db.update(shops).set({ status: 'suspended' }).where(eq(shops.id, shop.id))
    expect(await wallet.getCard(customer, shop.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'card' } })
    expect(await wallet.listActivity(customer, 10)).toMatchObject({ ok: true, value: [{ kind: 'checkIn' }] })
  }, SLOW)

  it('limits the activity to what was asked, newest first', async () => {
    const shops3 = [await data.createShop(), await data.createShop(), await data.createShop()]
    const customer = await data.createCustomer()
    for (const shop of shops3) await checkIn.checkIn(customer, shop.checkInCode)
    const activity = await wallet.listActivity(customer, 2)
    expect(activity.ok && activity.value.map((a) => a.shopId)).toEqual([shops3[2]?.id, shops3[1]?.id])
  }, SLOW)
})
