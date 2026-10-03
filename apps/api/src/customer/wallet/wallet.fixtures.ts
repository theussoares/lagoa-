import { catalogShop } from '../../shops/catalog.fixtures'
import type { ActivityRecord, WalletCardRecord } from './wallet.repository'

export function walletCardRecord(overrides: Partial<WalletCardRecord> = {}): WalletCardRecord {
  return {
    cardId: '0190a000-0000-7000-8000-0000000000c1',
    programId: '0190a000-0000-7000-8000-0000000000b1',
    balance: 0,
    lastVisitAt: null,
    rewardExpiresAt: null,
    shop: catalogShop(),
    earned: [],
    ...overrides,
  }
}

export function activityRecord(overrides: Partial<ActivityRecord> = {}): ActivityRecord {
  return {
    id: '0190a000-0000-7000-8000-0000000000e1',
    shopId: '0190a000-0000-7000-8000-0000000000a1',
    shopName: 'Barbearia do Zé',
    kind: 'visit',
    unit: 'stamp',
    unitsDelta: 1,
    rewardTitle: null,
    occurredAt: new Date('2026-10-03T12:00:00Z'),
    ...overrides,
  }
}
