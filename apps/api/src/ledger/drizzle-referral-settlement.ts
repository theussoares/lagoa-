import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { BonusRulesSchema, type ExpirationPolicy } from '#shared/schemas/program'
import { DB, type Database } from '../database/database.module'
import { loyaltyCards, programs, referrals, shops } from '../database/schema'
import { toExpirationPolicy } from '../programs/program-rules.mapper'
import { LedgerStore } from './ledger.store'
import { ReferralSettlement, type SettlementOutcome } from './referral-settlement'

const NEVER: ExpirationPolicy = { kind: 'never' }

@Injectable()
export class DrizzleReferralSettlement extends ReferralSettlement {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly ledger: LedgerStore,
  ) {
    super()
  }

  async settlePending(referredId: string, shopId: string, now: Date): Promise<SettlementOutcome> {
    // Quase ninguém tem indicação pendente: uma leitura simples (índice único) evita abrir transação à toa.
    const [pending] = await this.db
      .select({ id: referrals.id })
      .from(referrals)
      .where(and(eq(referrals.shopId, shopId), eq(referrals.referredId, referredId), eq(referrals.status, 'pending')))
      .limit(1)
    if (!pending) return 'none'

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          referralId: referrals.id,
          referrerId: referrals.referrerId,
          capturedAt: referrals.createdAt,
          programId: programs.id,
          target: programs.target,
          bonusRules: programs.bonusRules,
          expirationKind: programs.expirationKind,
          expirationMonths: programs.expirationMonths,
          shopStatus: shops.status,
          referredCardCreatedAt: loyaltyCards.createdAt,
          referredLastVisitAt: loyaltyCards.lastVisitAt,
        })
        .from(referrals)
        .innerJoin(shops, eq(shops.id, referrals.shopId))
        .innerJoin(programs, and(eq(programs.shopId, referrals.shopId), eq(programs.active, true)))
        .leftJoin(loyaltyCards, and(eq(loyaltyCards.shopId, referrals.shopId), eq(loyaltyCards.customerId, referrals.referredId)))
        .where(and(eq(referrals.shopId, shopId), eq(referrals.referredId, referredId), eq(referrals.status, 'pending')))
        .for('update', { of: referrals })
      // Sem pendência, ou o indicado ainda não visitou de verdade (cartão só com bônus não vale): a pendência continua.
      if (!row || row.referredCardCreatedAt === null || row.referredLastVisitAt === null) return 'none'

      const bonusRules = BonusRulesSchema.safeParse(row.bonusRules)
      const eligible =
        bonusRules.success &&
        bonusRules.data.referralBonus.enabled &&
        row.shopStatus === 'approved' &&
        row.referrerId !== referredId &&
        // O cartão tem de ter nascido depois do convite: quem já era cliente não vale como "novo".
        row.referredCardCreatedAt >= row.capturedAt
      if (!bonusRules.success || !eligible) {
        await tx.update(referrals).set({ status: 'rejected' }).where(eq(referrals.id, row.referralId))
        return 'rejected'
      }

      // O bônus cai no cartão do indicador, que pode estar numa versão antiga do programa: meta e vencimento são dessa versão.
      const [own] = await tx
        .select({
          programId: programs.id,
          target: programs.target,
          expirationKind: programs.expirationKind,
          expirationMonths: programs.expirationMonths,
        })
        .from(loyaltyCards)
        .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
        .where(and(eq(loyaltyCards.shopId, shopId), eq(loyaltyCards.customerId, row.referrerId)))
        .limit(1)
      const version = own ?? row
      const policy = toExpirationPolicy(version)
      const { card } = await this.ledger.lockOrCreateCard(
        tx,
        { shopId, customerId: row.referrerId, programId: version.programId },
        { policy: policy.ok ? policy.value : NEVER, target: version.target, now },
      )
      const bonus = await this.ledger.creditBonus(tx, {
        card,
        target: version.target,
        units: bonusRules.data.referralBonus.units,
        kind: 'referralBonus',
        now,
        idempotencyKey: `referral:${row.referralId}`,
      })
      await tx
        .update(referrals)
        .set({ status: 'rewarded', rewardEntryId: bonus.entryId, rewardedAt: now })
        .where(eq(referrals.id, row.referralId))
      return 'rewarded'
    })
  }
}
