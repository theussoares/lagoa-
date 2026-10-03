import { catalogShop } from '../../shops/catalog.fixtures'
import type { CheckInShop } from './check-in.repository'

export function checkInShop(overrides: Partial<CheckInShop> = {}): CheckInShop {
  return {
    shop: catalogShop(),
    programId: '0190a000-0000-7000-8000-0000000000b1',
    checkInEnabled: true,
    cooldownHours: 24,
    ...overrides,
  }
}
