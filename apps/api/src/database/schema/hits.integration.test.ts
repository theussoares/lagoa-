import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL, TestDatabase, type TestShop } from '../../test-support/test-database'
import * as schema from '.'

/** O erro do driver embrulha a causa (`cause.constraint_name`); `rejects.toThrow` sozinho aceitaria qualquer falha. */
async function violatedConstraint(attempt: Promise<unknown>): Promise<string | undefined> {
  try {
    await attempt
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined
    return typeof cause === 'object' && cause !== null && 'constraint_name' in cause ? String(cause.constraint_name) : undefined
  }
  return undefined
}

describe.skipIf(!TEST_DATABASE_URL)('hits tables (integration)', () => {
  let testDb: TestDatabase
  let shop: TestShop
  let adminId: string

  beforeAll(async () => {
    testDb = new TestDatabase(TEST_DATABASE_URL as string)
    shop = await testDb.createShop()
    adminId = (await testDb.createAdminUser()).id
  })
  afterAll(async () => {
    await testDb.cleanup()
    await testDb.close()
  })

  it('accepts a plain hit item with the shop button left null', async () => {
    const item = await testDb.createHitItem(shop.id)
    expect(item.id).toBeTruthy()
  })

  it('accepts a hit item that has no photo yet', async () => {
    const item = await testDb.createHitItem(shop.id, { photoPath: null })
    expect(item.id).toBeTruthy()
  })

  it('rejects a url button that is not https', async () => {
    const insert = testDb.db.insert(schema.hitItems).values({
      shopId: shop.id, title: 'Café', photoPath: 'hits/x.jpg', ctaKind: 'url', ctaUrl: 'http://x', ctaLabel: 'Ver',
    })
    expect(await violatedConstraint(insert)).toBe('hit_items_cta_modes_check')
  })

  it('rejects a rejected item without a reason', async () => {
    const insert = testDb.db.insert(schema.hitItems).values({ shopId: shop.id, title: 'Café', photoPath: 'hits/x.jpg', status: 'rejected' })
    expect(await violatedConstraint(insert)).toBe('hit_items_rejection_reason_check')
  })

  it('rejects a zero price', async () => {
    const insert = testDb.db.insert(schema.hitItems).values({ shopId: shop.id, title: 'Café', photoPath: 'hits/x.jpg', priceCents: 0 })
    expect(await violatedConstraint(insert)).toBe('hit_items_price_check')
  })

  it('rejects a title longer than 60 characters', async () => {
    const insert = testDb.db.insert(schema.hitItems).values({ shopId: shop.id, title: 'a'.repeat(61), photoPath: 'hits/x.jpg' })
    expect(await violatedConstraint(insert)).toBe('hit_items_title_check')
  })

  it('rejects a hitsBanner placement without an item', async () => {
    const insert = testDb.db.insert(schema.featuredPlacements).values({
      shopId: shop.id, surface: 'hitsBanner', startsAt: new Date('2030-01-01'), endsAt: new Date('2030-02-01'), createdByAdminId: adminId,
    })
    expect(await violatedConstraint(insert)).toBe('featured_placements_item_check')
  })

  it('rejects a discoverCarousel placement that points at an item', async () => {
    const item = await testDb.createHitItem(shop.id)
    const insert = testDb.db.insert(schema.featuredPlacements).values({
      shopId: shop.id, surface: 'discoverCarousel', hitItemId: item.id, startsAt: new Date('2030-01-01'), endsAt: new Date('2030-02-01'), createdByAdminId: adminId,
    })
    expect(await violatedConstraint(insert)).toBe('featured_placements_item_check')
  })

  it('rejects a placement whose end equals its start', async () => {
    const moment = new Date('2030-01-01')
    const insert = testDb.db.insert(schema.featuredPlacements).values({
      shopId: shop.id, surface: 'discoverCarousel', startsAt: moment, endsAt: moment, createdByAdminId: adminId,
    })
    expect(await violatedConstraint(insert)).toBe('featured_placements_period_check')
  })

  it('rejects a second admin with the same email hash', async () => {
    const emailHash = Buffer.from(randomUUID())
    await testDb.createAdminUser({ emailHash })
    const duplicate = testDb.db.insert(schema.adminUsers).values({
      id: randomUUID(), name: 'Outro', emailEncrypted: Buffer.from('x'), emailHash,
    })
    expect(await violatedConstraint(duplicate)).toBe('admin_users_email_hash_unique')
  })
})
