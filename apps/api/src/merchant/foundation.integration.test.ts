import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../common/clock'
import { AccountService } from '../customer/account/account.service'
import { DrizzleAccountRepository } from '../customer/account/drizzle-account.repository'
import { CheckInService } from '../customer/check-in/check-in.service'
import { DrizzleCheckInRepository } from '../customer/check-in/drizzle-check-in.repository'
import { backfillCardVisits } from '../database/backfill-card-visits'
import { appUsers, customerProfiles, ledgerEntries, loyaltyCards, shops, shopStatusEvents } from '../database/schema'
import { changeShopStatus } from '../database/shop-status'
import { DrizzleReferralSettlement } from '../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../ledger/ledger.store'
import { claimVisit } from '../test-support/claim-visit'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { DrizzleMerchantShopResolver } from './access/drizzle-merchant-shop.resolver'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('merchant foundation against a real database', () => {
  let data: TestDatabase
  let checkIn: CheckInService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock(), new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  const cardOf = async (customerId: string) => {
    const [card] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customerId))
    if (!card) throw new Error('card expected')
    return card
  }

  it('keeps visits_count and first_visit_at in step with the ledger on every visit', async () => {
    const shop = await data.createShop({ bonusRules: { ...(await import('../test-support/test-database')).NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } } })
    const me = await data.createCustomer()
    expect(await claimVisit(data, checkIn, me, shop)).toMatchObject({ ok: true })

    const first = await cardOf(me)
    const rows = await data.db.select().from(ledgerEntries).where(eq(ledgerEntries.customerId, me))
    const visits = rows.filter((row) => row.countsAsVisit)
    // Boas-vindas não é visita: o contador conta só `counts_as_visit`.
    expect(rows.length).toBeGreaterThan(visits.length)
    expect(first.visitsCount).toBe(visits.length)
    expect(first.firstVisitAt?.getTime()).toBe(Math.min(...visits.map((row) => row.occurredAt.getTime())))
  }, SLOW)

  it('backfill recalculates from the ledger and is idempotent', async () => {
    const shop = await data.createShop()
    const me = await data.createCustomer()
    await claimVisit(data, checkIn, me, shop)
    const good = await cardOf(me)
    await data.db.update(loyaltyCards).set({ visitsCount: 0, firstVisitAt: null }).where(eq(loyaltyCards.id, good.id))

    expect(await backfillCardVisits(data.db)).toBeGreaterThanOrEqual(1)
    expect(await cardOf(me)).toMatchObject({ visitsCount: good.visitsCount, firstVisitAt: good.firstVisitAt })
    // Repetir não muda mais nada deste cartão.
    await backfillCardVisits(data.db)
    expect(await cardOf(me)).toMatchObject({ visitsCount: good.visitsCount, firstVisitAt: good.firstVisitAt })
  }, SLOW)

  it('backfill does not overwrite a check-in that commits while it waits for the card lock', async () => {
    const shop = await data.createShop()
    const me = await data.createCustomer()
    await claimVisit(data, checkIn, me, shop)
    const card = await cardOf(me)
    await data.db.update(loyaltyCards).set({ visitsCount: 0, firstVisitAt: null }).where(eq(loyaltyCards.id, card.id))

    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    // Faz o que o `LedgerStore.credit` faz: trava o cartão, grava a visita e sobe o contador, e só depois confirma.
    const checkingIn = data.db.transaction(async (tx) => {
      await tx.execute(sql`select id from loyalty_cards where id = ${card.id} for update`)
      await tx.insert(ledgerEntries).values({
        cardId: card.id, shopId: shop.id, customerId: me, kind: 'visit', unitsDelta: 1, countsAsVisit: true,
        idempotencyKey: `race-${randomUUID()}`, occurredAt: new Date(),
      })
      await tx.update(loyaltyCards).set({ visitsCount: sql`${loyaltyCards.visitsCount} + 1`, firstVisitAt: new Date() }).where(eq(loyaltyCards.id, card.id))
      await gate
    })
    await new Promise((resolve) => setTimeout(resolve, 150))
    const backfilling = backfillCardVisits(data.db)
    await new Promise((resolve) => setTimeout(resolve, 300))
    release()
    await Promise.all([checkingIn, backfilling])

    const rows = await data.db.select().from(ledgerEntries).where(eq(ledgerEntries.cardId, card.id))
    expect((await cardOf(me)).visitsCount).toBe(rows.filter((row) => row.countsAsVisit).length)
  }, SLOW)

  it('refuses a second shop for the same owner (one owner, one shop)', async () => {
    const shop = await data.createShop()
    const [owned] = await data.db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, shop.id))
    const second = await data.createShop()
    await expect(data.db.update(shops).set({ ownerUserId: owned?.ownerUserId ?? '' }).where(eq(shops.id, second.id))).rejects.toThrow()
  }, SLOW)

  it('resolves the shop of the signed-in owner only, with status and plan', async () => {
    const shop = await data.createShop({ status: 'pending' })
    const [row] = await data.db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, shop.id))
    const resolver = new DrizzleMerchantShopResolver(data.db)
    expect(await resolver.resolveForUser(row?.ownerUserId ?? '')).toEqual({ shopId: shop.id, status: 'pending', plan: 'founder', role: 'owner', termsVersion: null })
    expect(await resolver.resolveForUser(await data.createCustomer())).toBeNull()
  }, SLOW)

  it('changes status and plan from the admin script and writes the audit event', async () => {
    const shop = await data.createShop({ status: 'pending' })
    expect(await changeShopStatus(data.db, { shopId: shop.id, status: 'approved', plan: 'founderPro', actor: 'matheus', reason: 'piloto' })).toEqual({
      ok: true,
      from: 'pending',
      to: 'approved',
      plan: 'founderPro',
    })
    expect((await data.db.select({ status: shops.status, plan: shops.plan }).from(shops).where(eq(shops.id, shop.id)))[0]).toEqual({ status: 'approved', plan: 'founderPro' })
    expect(await data.db.select().from(shopStatusEvents).where(eq(shopStatusEvents.shopId, shop.id))).toMatchObject([
      { fromStatus: 'pending', toStatus: 'approved', plan: 'founderPro', actor: 'matheus', reason: 'piloto' },
    ])
    expect(await changeShopStatus(data.db, { shopId: shop.id, actor: 'matheus' })).toEqual({ ok: false, reason: 'nothingToChange' })
    expect(await changeShopStatus(data.db, { shopId: shop.id, status: 'approved', plan: 'founderPro', actor: 'matheus' })).toEqual({ ok: false, reason: 'nothingToChange' })
    expect(await changeShopStatus(data.db, { shopId: shop.id, status: 'suspended', actor: 'ana@x.com' })).toEqual({ ok: false, reason: 'invalidActor' })
    expect(await changeShopStatus(data.db, { shopId: '0190ae00-0000-7000-8000-00000000dead', status: 'approved', actor: 'matheus' })).toEqual({ ok: false, reason: 'shopNotFound' })
  }, SLOW)

  it('stamps erased_at on erasure, but refuses to erase the account of a shop owner (accountOwnsShop)', async () => {
    const accounts = new AccountService(new DrizzleAccountRepository(data.db), new SystemClock())
    const plain = await data.createCustomer()
    expect(await accounts.erase(plain)).toEqual({ ok: true, value: undefined })
    expect((await data.db.select({ erasedAt: appUsers.erasedAt }).from(appUsers).where(eq(appUsers.id, plain)))[0]?.erasedAt).toBeInstanceOf(Date)

    const owner = await data.createCustomer()
    const shop = await data.createShop()
    await data.db.update(shops).set({ ownerUserId: owner }).where(eq(shops.id, shop.id))
    await data.db.update(customerProfiles).set({ firstName: 'Dona' }).where(eq(customerProfiles.userId, owner))
    expect(await accounts.erase(owner)).toEqual({ ok: false, error: { code: 'accountOwnsShop' } })
    const [kept] = await data.db.select({ erasedAt: appUsers.erasedAt, phone: appUsers.phoneEncrypted }).from(appUsers).where(eq(appUsers.id, owner))
    expect(kept?.erasedAt).toBeNull()
    expect(kept?.phone.length).toBeGreaterThan(0)
    expect((await data.db.select({ firstName: customerProfiles.firstName }).from(customerProfiles).where(eq(customerProfiles.userId, owner)))[0]?.firstName).toBe('Dona')
  }, SLOW)
  it('erasure waits for a shop being created for the same account and then refuses (no shop without a login)', async () => {
    const accounts = new AccountService(new DrizzleAccountRepository(data.db), new SystemClock())
    const owner = await data.createCustomer()
    const shop = await data.createShop()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    // O que o Criar o clube faz: lê a conta com FOR SHARE, dá a loja ao dono e só então confirma.
    const creating = data.db.transaction(async (tx) => {
      await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.id, owner)).for('share')
      await tx.update(shops).set({ ownerUserId: owner }).where(eq(shops.id, shop.id))
      await gate
    })
    await new Promise((resolve) => setTimeout(resolve, 150))
    const erasing = accounts.erase(owner)
    await new Promise((resolve) => setTimeout(resolve, 300))
    release()
    await creating
    expect(await erasing).toEqual({ ok: false, error: { code: 'accountOwnsShop' } })
    expect((await data.db.select({ erasedAt: appUsers.erasedAt }).from(appUsers).where(eq(appUsers.id, owner)))[0]?.erasedAt).toBeNull()
  }, SLOW)
})
