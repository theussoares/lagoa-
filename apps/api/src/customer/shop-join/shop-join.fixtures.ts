import { type ShopJoinRepository, type JoinableShop } from './shop-join.repository'
import type { ErrorOf } from '#shared/types/errors'
import { ok, type Result } from '#shared/types/result'

export const SHOP_ID = '0190a000-0000-7000-8000-0000000000a1'
export const PROGRAM_ID = '0190a000-0000-7000-8000-0000000000b1'
export const CARD_ID = '0190a000-0000-7000-8000-0000000000c1'

export function joinableShop(overrides: Partial<JoinableShop> = {}): JoinableShop {
  return { shopId: SHOP_ID, programId: PROGRAM_ID, joinEnabled: true, expiration: { kind: 'never' }, target: 10, ...overrides }
}

/** Repositório em memória: guarda o que o service pediu e deixa o teste escolher a loja e o cartão. */
export class FakeShopJoinRepository implements ShopJoinRepository {
  lookedUp: string[] = []
  joins: { customerId: string; shop: JoinableShop; now: Date }[] = []
  existingCardId: string | null = null
  created = true
  failure: Error | null = null
  constructor(public shop: JoinableShop | null = joinableShop()) {}

  async findShopByCode(code: string): Promise<JoinableShop | null> {
    this.lookedUp.push(code)
    if (this.failure) throw this.failure
    return this.shop
  }
  async findCardId(): Promise<string | null> {
    return this.existingCardId
  }
  async join(customerId: string, shop: JoinableShop, now: Date): Promise<Result<{ cardId: string; created: boolean }, ErrorOf<'unauthorized'>>> {
    this.joins.push({ customerId, shop, now })
    return ok({ cardId: CARD_ID, created: this.created })
  }
}
