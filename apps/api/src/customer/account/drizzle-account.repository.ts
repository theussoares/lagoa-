import { createHash } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { REFERRAL_CODE_LENGTH } from '#shared/constants/domain'
import { generateReadableCode } from '../../common/readable-code'
import { DB, type Database } from '../../database/database.module'
import { appUsers, customerProfiles, loyaltyCards, redemptions, referrals, visitQrs } from '../../database/schema'
import { AccountRepository } from './account.repository'

@Injectable()
export class DrizzleAccountRepository extends AccountRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  /** Pública para o `EXPLAIN` provar o índice parcial `visit_qrs_claimed_by_idx` com a mesma consulta que roda de verdade. */
  clearVisitQrClaimsQuery(executor: Pick<Database, 'update'>, userId: string) {
    return executor.update(visitQrs).set({ claimedBy: null }).where(eq(visitQrs.claimedBy, userId))
  }

  async erase(userId: string, now: Date): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [profile] = await tx.select({ id: customerProfiles.userId }).from(customerProfiles).where(eq(customerProfiles.userId, userId)).for('update').limit(1)
      if (!profile) return false

      const cards = tx.select({ id: loyaltyCards.id }).from(loyaltyCards).where(eq(loyaltyCards.customerId, userId))
      await tx.update(redemptions).set({ status: 'expired' }).where(and(inArray(redemptions.cardId, cards), eq(redemptions.status, 'active')))
      // Convite aberto de ou para quem saiu não paga bônus a uma conta apagada.
      await tx
        .update(referrals)
        .set({ status: 'rejected' })
        .where(and(or(eq(referrals.referrerId, userId), eq(referrals.referredId, userId)), eq(referrals.status, 'pending')))
      // O QR usado continua `claimed` (e o ganho no ledger) sem apontar para a pessoa que saiu.
      await this.clearVisitQrClaimsQuery(tx, userId)
      await tx
        .update(customerProfiles)
        .set({
          firstName: null,
          birthday: null,
          birthdayChangedAt: null,
          notificationsConsent: false,
          consentUpdatedAt: now,
          rankingOptIn: false,
          rankingName: null,
          referralCode: generateReadableCode(REFERRAL_CODE_LENGTH),
        })
        .where(eq(customerProfiles.userId, userId))
      await tx
        .update(appUsers)
        .set({ emailEncrypted: null, emailHash: null, phoneEncrypted: Buffer.alloc(0), phoneHash: createHash('sha256').update(`deleted:${userId}`).digest() })
        .where(eq(appUsers.id, userId))
      // O login mora no Supabase Auth: sem essa linha a pessoa não entra mais (a sessão aberta morre quando o token vence).
      const [auth] = await tx.execute<{ present: boolean }>(sql`select to_regclass('auth.users') is not null as present`)
      if (auth?.present) await tx.execute(sql`delete from auth.users where id = ${userId}`)
      return true
    })
  }
}
