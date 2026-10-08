import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../database/database.module'
import { PostgresThrottlerStorage, RateLimitStorageUnavailableError, SWEEP_PROBABILITY } from './postgres-throttler.storage'

const row = { hits: 2, window_left_ms: 30_000, block_left_ms: 0 }

function storageOver(execute: () => Promise<unknown>, random = () => 1, timeoutMs = 50): { storage: PostgresThrottlerStorage; execute: ReturnType<typeof vi.fn> } {
  const spy = vi.fn(execute)
  const db = { execute: spy } as unknown as Database
  return { storage: new PostgresThrottlerStorage(db, { random, timeoutMs }), execute: spy }
}

describe('PostgresThrottlerStorage', () => {
  it('makes one database round trip per request and maps the row', async () => {
    const { storage, execute } = storageOver(async () => [row])
    await expect(storage.increment('k', 60_000, 5, 0, 'default')).resolves.toEqual({ totalHits: 2, timeToExpire: 30, isBlocked: false, timeToBlockExpire: 0 })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('sweeps expired rows only on a small share of requests', async () => {
    const { storage, execute } = storageOver(async () => [row], () => SWEEP_PROBABILITY / 2)
    await storage.increment('k', 60_000, 5, 0, 'default')
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('does not fail the request when the sweep fails', async () => {
    let calls = 0
    const { storage } = storageOver(async () => {
      calls += 1
      if (calls > 1) throw new Error('boom')
      return [row]
    }, () => 0)
    await expect(storage.increment('k', 60_000, 5, 0, 'default')).resolves.toMatchObject({ totalHits: 2 })
  })

  it('signals unavailability when the database fails, without leaking the driver message', async () => {
    const { storage } = storageOver(async () => {
      throw new Error('select ... 5511999990000')
    })
    await expect(storage.increment('k', 60_000, 5, 0, 'default')).rejects.toBeInstanceOf(RateLimitStorageUnavailableError)
    await expect(storage.increment('k', 60_000, 5, 0, 'default')).rejects.toThrow('Rate limit counter unavailable')
  })

  it('signals unavailability when the database is too slow', async () => {
    const { storage } = storageOver(() => new Promise(() => undefined), () => 1, 10)
    await expect(storage.increment('k', 60_000, 5, 0, 'default')).rejects.toBeInstanceOf(RateLimitStorageUnavailableError)
  })
})
