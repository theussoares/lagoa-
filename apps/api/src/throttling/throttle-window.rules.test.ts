import { describe, expect, it } from 'vitest'
import { toStorageRecord } from './throttle-window.rules'

describe('toStorageRecord', () => {
  it('lets a request under the limit through and reports the window in whole seconds', () => {
    expect(toStorageRecord({ hits: 3, windowLeftMs: 59_001, blockLeftMs: 0 }, 5, 0)).toEqual({
      totalHits: 3,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    })
  })

  it('allows exactly the limit and blocks the next hit until the window closes', () => {
    expect(toStorageRecord({ hits: 5, windowLeftMs: 10_000, blockLeftMs: 0 }, 5, 0).isBlocked).toBe(false)
    expect(toStorageRecord({ hits: 6, windowLeftMs: 10_000, blockLeftMs: 0 }, 5, 0)).toMatchObject({ isBlocked: true, timeToBlockExpire: 10 })
  })

  it('with a block duration, blocks only while the database says the block is running', () => {
    expect(toStorageRecord({ hits: 6, windowLeftMs: 10_000, blockLeftMs: 0 }, 5, 30_000).isBlocked).toBe(false)
    expect(toStorageRecord({ hits: 6, windowLeftMs: 10_000, blockLeftMs: 29_500 }, 5, 30_000)).toMatchObject({ isBlocked: true, timeToBlockExpire: 30 })
  })

  it('never reports a negative wait', () => {
    expect(toStorageRecord({ hits: 9, windowLeftMs: -500, blockLeftMs: 1 }, 5, 1000)).toMatchObject({ timeToExpire: 0, timeToBlockExpire: 1 })
  })
})
