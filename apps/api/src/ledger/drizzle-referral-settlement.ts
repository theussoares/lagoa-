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
        })
        .from(referrals)
        .innerJoin(shops, eq(shops.id, referrals.shopId))
        .innerJoin(programs, eq(programs.shopId, referrals.shopId))
        .leftJoin(loyaltyCards, and(eq(loyaltyCards.shopId, referrals.shopId), eq(loyaltyCards.customerId, referrals.referredId)))
        .where(and(eq(referrals.shopId, shopId), eq(referrals.referredId, referredId), eq(referrals.status, 'pending')))
        .for('update', { of: referrals })
      // Sem pendência, ou o indicado ainda não fez a primeira visita: nada a pagar (a pendência continua).
      if (!row || row.referredCardCreatedAt === null) return 'none'

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

      const policy = toExpirationPolicy(row)
      const { card } = await this.ledger.lockOrCreateCard(
        tx,
        { shopId, customerId: row.referrerId, programId: row.programId },
        { policy: policy.ok ? policy.value : NEVER, target: row.target, now },
      )
      const bonus = await this.ledger.creditBonus(tx, {
        card,
        target: row.target,
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
