import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { rateLimits } from '../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { PostgresThrottlerStorage } from './postgres-throttler.storage'

const prefix = `itest-${Date.now()}-`
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe.skipIf(!TEST_DATABASE_URL)('PostgresThrottlerStorage on a real database', () => {
  let data: TestDatabase
  // Duas "instâncias" da API: storages separados sobre o mesmo banco.
  let instanceA: PostgresThrottlerStorage
  let instanceB: PostgresThrottlerStorage
  let key: string
  let counter = 0

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    instanceA = new PostgresThrottlerStorage(data.db, { random: () => 1 })
    instanceB = new PostgresThrottlerStorage(data.db, { random: () => 1 })
  })

  beforeEach(() => {
    counter += 1
    key = `${prefix}${counter}`
  })

  afterAll(async () => {
    await data.db.delete(rateLimits).where(sql`${rateLimits.key} like ${`${prefix}%`}`)
    await data.close()
  })

  it('shares one counter across instances and blocks past the limit', async () => {
    expect((await instanceA.increment(key, 60_000, 3, 0, 'default')).totalHits).toBe(1)
    expect((await instanceB.increment(key, 60_000, 3, 0, 'default')).totalHits).toBe(2)
    expect((await instanceA.increment(key, 60_000, 3, 0, 'default')).isBlocked).toBe(false)
    const refused = await instanceB.increment(key, 60_000, 3, 0, 'default')
    expect(refused).toMatchObject({ totalHits: 4, isBlocked: true })
    expect(refused.timeToBlockExpire).toBeGreaterThan(0)
  })

  it('counts concurrent requests from both instances without losing hits', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? instanceA : instanceB).increment(key, 60_000, 100, 0, 'default')))
    expect((await instanceA.increment(key, 60_000, 100, 0, 'default')).totalHits).toBe(21)
  })

  it('reopens the window after it expires', async () => {
    await instanceA.increment(key, 300, 1, 0, 'default')
    expect((await instanceB.increment(key, 300, 1, 0, 'default')).isBlocked).toBe(true)
    await sleep(400)
    expect(await instanceB.increment(key, 300, 1, 0, 'default')).toMatchObject({ totalHits: 1, isBlocked: false })
  })

  it('holds a block for blockDuration even after the window ended, then releases it', async () => {
    await instanceA.increment(key, 200, 1, 600, 'default')
    expect((await instanceB.increment(key, 200, 1, 600, 'default')).isBlocked).toBe(true)
    await sleep(300)
    expect((await instanceA.increment(key, 200, 1, 600, 'default')).isBlocked).toBe(true)
    await sleep(500)
    expect(await instanceA.increment(key, 200, 1, 600, 'default')).toMatchObject({ totalHits: 1, isBlocked: false })
  })

  it('sweeps expired rows on a sweeping request and keeps live ones', async () => {
    const expiredKey = `${key}-old`
    await instanceA.increment(expiredKey, 50, 5, 0, 'default')
    await instanceA.increment(key, 60_000, 5, 0, 'default')
    await sleep(120)
    const sweeper = new PostgresThrottlerStorage(data.db, { random: () => 0 })
    await sweeper.increment(`${key}-trigger`, 60_000, 5, 0, 'default')
    await sleep(300)
    const left = await data.db.select({ key: rateLimits.key }).from(rateLimits).where(sql`${rateLimits.key} like ${`${prefix}%`}`)
    const keys = left.map((r) => r.key)
    expect(keys).not.toContain(expiredKey)
    expect(keys).toContain(key)
  })
})
