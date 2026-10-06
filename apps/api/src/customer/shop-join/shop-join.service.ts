import { Injectable } from '@nestjs/common'
import { type ShopJoinResult, ShopJoinResultSchema } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { parseCheckInCode } from '#shared/utils/checkInCode'
import { Clock } from '../../common/clock'
import { decideShopJoin } from './shop-join.rules'
import { ShopJoinRepository } from './shop-join.repository'

export type ShopJoinError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'unauthorized'>

/** Entrar no clube pelo cartaz: cria o cartão zerado. Não ganha carimbo e não paga indicação (RN-19). */
@Injectable()
export class ShopJoinService {
  constructor(
    private readonly repository: ShopJoinRepository,
    private readonly clock: Clock,
  ) {}

  async joinShop(customerId: string, rawCode: string): Promise<Result<ShopJoinResult, ShopJoinError>> {
    const code = parseCheckInCode(rawCode)
    if (!code.ok) return code
    const shop = await this.repository.findShopByCode(code.value)
    if (shop === null) return err({ code: 'invalidShopQr' })

    const existingCardId = await this.repository.findCardId(customerId, shop.shopId)
    const decision = decideShopJoin(shop, existingCardId)
    if (!decision.ok) return decision
    if (existingCardId !== null) return ok(this.result(shop.shopId, existingCardId, true))

    const joined = await this.repository.join(customerId, shop, this.clock.now())
    if (!joined.ok) return joined
    // Perdeu a corrida para outro envio do mesmo cliente: o cartão já existia.
    return ok(this.result(shop.shopId, joined.value.cardId, !joined.value.created))
  }

  private result(shopId: string, cardId: string, alreadyMember: boolean): ShopJoinResult {
    return ShopJoinResultSchema.parse({ shopId, cardId, alreadyMember })
  }
}
