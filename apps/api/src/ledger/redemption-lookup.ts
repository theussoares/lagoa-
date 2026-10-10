import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gte, or, sql } from 'drizzle-orm'
import { REDEMPTION_LOOKUP_WINDOW_HOURS } from '#shared/constants/domain'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { normalizeReadableCode } from '#shared/utils/readableCode'
import { addHours } from '#shared/utils/time'
import { DB, type Database } from '../database/database.module'
import { loyaltyCards, redemptions } from '../database/schema'

export type RedemptionLookupError = ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>

export interface ActiveRedemption {
  readonly redemptionId: string
  readonly customerId: string
  readonly rewardTitle: string
  readonly expiresAt: Date
}

/**
 * Como o Balcão acha o código: o lojista digita `(loja, código)`. Código inexistente, de outra loja
 * ou mal digitado dão a mesma resposta (`redemptionInvalid`). O ativo vale (ou `redemptionExpired` se já passou do
 * prazo). Sem ativo, a linha mais nova da loja com aquele código, criada há no máximo
 * `REDEMPTION_LOOKUP_WINDOW_HOURS`, explica o que houve (`redemptionAlreadyUsed` / `redemptionExpired`); mais velha que
 * isso o código já foi reaproveitado e volta a ser `redemptionInvalid`.
 * Só lê: quem entrega é `LedgerStore.settleRedemption`. Devolve o `customerId` cru: quem monta o
 * `RedemptionPreview` do Balcão precisa mascarar o celular (`maskPhone`) antes de responder.
 */
@Injectable()
export class RedemptionLookup {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Pública para o `EXPLAIN` provar o índice `redemptions_shop_code_created_idx` com a mesma consulta que roda de verdade. */
  findQuery(executor: Pick<Database, 'select'>, shopId: string, code: string, now: Date) {
    return executor
      .select({
        redemptionId: redemptions.id,
        customerId: loyaltyCards.customerId,
        rewardTitle: redemptions.rewardTitle,
        expiresAt: redemptions.expiresAt,
        status: redemptions.status,
      })
      .from(redemptions)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
      .where(
        and(
          eq(redemptions.shopId, shopId),
          eq(redemptions.code, code),
          // O ativo primeiro; entre os demais, o mais novo dentro da janela.
          or(eq(redemptions.status, 'active'), gte(redemptions.createdAt, addHours(now, -REDEMPTION_LOOKUP_WINDOW_HOURS))),
        ),
      )
      .orderBy(sql`(${redemptions.status} = 'active') desc`, sql`${redemptions.createdAt} desc nulls last`)
      .limit(1)
  }

  async findByCode(shopId: string, rawCode: string, now: Date): Promise<Result<ActiveRedemption, RedemptionLookupError>> {
    const code = RedemptionCodeSchema.safeParse(normalizeReadableCode(rawCode))
    if (!code.success) return err({ code: 'redemptionInvalid' })

    const [row] = await this.findQuery(this.db, shopId, code.data, now)
    if (!row) return err({ code: 'redemptionInvalid' })
    if (row.status === 'redeemed') return err({ code: 'redemptionAlreadyUsed' })
    if (row.status === 'expired' || row.expiresAt <= now) return err({ code: 'redemptionExpired' })
    return ok(row)
  }
}
