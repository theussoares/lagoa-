import { describe, expect, it } from 'vitest'
import { buildExampleSeed } from '#layers/core/app/mock'
import { MockStateSchema } from '#layers/core/app/mock/state'
import { TEST_NOW } from './fixtures'

describe('example seed', () => {
  it('matches the mock state schema', () => {
    expect(MockStateSchema.safeParse(buildExampleSeed(TEST_NOW)).success).toBe(true)
  })

  it('keeps every card balance consistent with its stamps', () => {
    for (const card of buildExampleSeed(TEST_NOW).cards) {
      if (card.unit === 'stamp') expect(card.stamps).toHaveLength(card.balance)
    }
  })
})
