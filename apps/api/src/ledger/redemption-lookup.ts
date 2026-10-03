import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { normalizeReadableCode } from '#shared/utils/readableCode'
import { DB, type Database } from '../database/database.module'
import { loyaltyCards, redemptions } from '../database/schema'

export interface ActiveRedemption {
  readonly redemptionId: string
  readonly customerId: string
  readonly rewardTitle: string
  readonly expiresAt: Date
}

/**
 * Como o Balcão acha o código: o lojista digita `(loja, código)`. Código inexistente, de outra loja
 * ou mal digitado dão a mesma resposta (`redemptionInvalid`); o vencido, `redemptionExpired`.
 * Só lê: quem entrega é `LedgerStore.settleRedemption`.
 */
@Injectable()
export class RedemptionLookup {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findActive(shopId: string, rawCode: string, now: Date): Promise<Result<ActiveRedemption, ErrorOf<'redemptionInvalid' | 'redemptionExpired'>>> {
    const code = RedemptionCodeSchema.safeParse(normalizeReadableCode(rawCode))
    if (!code.success) return err({ code: 'redemptionInvalid' })

    const [row] = await this.db
      .select({
        redemptionId: redemptions.id,
        customerId: loyaltyCards.customerId,
        rewardTitle: redemptions.rewardTitle,
        expiresAt: redemptions.expiresAt,
      })
      .from(redemptions)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
      .where(and(eq(redemptions.shopId, shopId), eq(redemptions.code, code.data), eq(redemptions.status, 'active')))
      .limit(1)
    if (!row) return err({ code: 'redemptionInvalid' })
    return row.expiresAt <= now ? err({ code: 'redemptionExpired' }) : ok(row)
  }
}
