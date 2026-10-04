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

import type { CheckInState } from './check-in.repository'

/** Estado de quem nunca visitou a loja (cartão recém-criado ou só com bônus). */
export const FIRST_VISIT: CheckInState = { card: { balance: 0, rewardExpiresAt: null, lastVisitAt: null }, birthday: null }

export function stateOf(card: { balance?: number; lastVisitAt?: Date | null; rewardExpiresAt?: Date | null }, birthday: CheckInState['birthday'] = null): CheckInState {
  return { card: { balance: card.balance ?? 0, rewardExpiresAt: card.rewardExpiresAt ?? null, lastVisitAt: card.lastVisitAt ?? null }, birthday }
}
