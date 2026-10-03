import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { loyaltyCards, programs, redemptions, shops } from '../../database/schema'
import {
  type RedemptionRecord,
  RedemptionRepository,
  type RedemptionRequestAttempt,
  type RedemptionRequestState,
  type RequestDecision,
} from './redemption.repository'

const CODE_ATTEMPTS = 5

const REDEMPTION_COLUMNS = {
  id: redemptions.id,
  code: redemptions.code,
  cardId: redemptions.cardId,
  shopId: redemptions.shopId,
  rewardTitle: redemptions.rewardTitle,
  status: redemptions.status,
  createdAt: redemptions.createdAt,
  expiresAt: redemptions.expiresAt,
}

@Injectable()
export class DrizzleRedemptionRepository extends RedemptionRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async request(
    { customerId, cardId, createdAt, expiresAt, newCode }: RedemptionRequestAttempt,
    decide: (state: RedemptionRequestState) => RequestDecision,
  ): Promise<Result<RedemptionRecord, ErrorOf<'notFound'> | ErrorOf<'rewardNotReady'>>> {
    return this.db.transaction(async (tx) => {
      // O dono do cartão está no filtro e o cartão fica travado: ninguém mais mexe nele até o commit.
      const [card] = await tx
        .select({
          shopId: loyaltyCards.shopId,
          balance: loyaltyCards.balance,
          target: programs.target,
          rewardTitle: programs.rewardTitle,
          shopStatus: shops.status,
        })
        .from(loyaltyCards)
        .innerJoin(shops, eq(shops.id, loyaltyCards.shopId))
        .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
        .where(and(eq(loyaltyCards.id, cardId), eq(loyaltyCards.customerId, customerId)))
        .for('update', { of: loyaltyCards })
      if (!card || card.shopStatus !== 'approved') return err({ code: 'notFound', entity: 'card' })

      const [active] = await tx
        .select(REDEMPTION_COLUMNS)
        .from(redemptions)
        .where(and(eq(redemptions.cardId, cardId), eq(redemptions.status, 'active')))
        .limit(1)

      const decision = decide({ balance: card.balance, target: card.target, active: active ?? null })
      if (decision.kind === 'notReady') return err({ code: 'rewardNotReady', remaining: decision.remaining })
      if (decision.kind === 'reuse' && active) return ok(active)

      if (decision.kind === 'create' && decision.expireStaleId !== null) {
        await tx.update(redemptions).set({ status: 'expired' }).where(eq(redemptions.id, decision.expireStaleId))
      }
      for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
        // Só uma colisão de código ativo na loja passa por aqui (o cartão está travado e sem código ativo).
        const [created] = await tx
          .insert(redemptions)
          .values({ cardId, shopId: card.shopId, rewardTitle: card.rewardTitle, code: newCode(), createdAt, expiresAt })
          .onConflictDoNothing({
            target: [redemptions.shopId, redemptions.code],
            where: sql`${redemptions.status} = 'active'`,
          })
          .returning(REDEMPTION_COLUMNS)
        if (created) return ok(created)
      }
      throw new Error('Could not allocate a unique redemption code')
    })
  }

  async find(customerId: string, redemptionId: string, now: Date): Promise<RedemptionRecord | null> {
    const [row] = await this.db
      .select(REDEMPTION_COLUMNS)
      .from(redemptions)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
      .where(and(eq(redemptions.id, redemptionId), eq(loyaltyCards.customerId, customerId)))
      .limit(1)
    if (!row) return null
    if (row.status !== 'active' || row.expiresAt > now) return row

    // Venceu e ninguém usou: libera o código da loja e responde já como vencido.
    const [expired] = await this.db
      .update(redemptions)
      .set({ status: 'expired' })
      .where(and(eq(redemptions.id, row.id), eq(redemptions.status, 'active')))
      .returning(REDEMPTION_COLUMNS)
    if (expired) return expired
    // A entrega confirmou no meio do caminho: devolve o que ficou gravado, não um vencido falso.
    const [current] = await this.db.select(REDEMPTION_COLUMNS).from(redemptions).where(eq(redemptions.id, row.id)).limit(1)
    return current ?? null
  }
}
