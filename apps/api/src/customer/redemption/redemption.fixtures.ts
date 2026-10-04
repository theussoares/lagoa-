import type { RedemptionRecord } from './redemption.repository'

export function redemptionRecord(overrides: Partial<RedemptionRecord> = {}): RedemptionRecord {
  return {
    id: '0190a000-0000-7000-8000-0000000000d1',
    code: 'ACD234',
    cardId: '0190a000-0000-7000-8000-0000000000c1',
    shopId: '0190a000-0000-7000-8000-0000000000a1',
    rewardTitle: 'Corte grátis',
    status: 'active',
    createdAt: new Date('2026-10-03T12:00:00Z'),
    expiresAt: new Date('2026-10-03T12:10:00Z'),
    ...overrides,
  }
}
