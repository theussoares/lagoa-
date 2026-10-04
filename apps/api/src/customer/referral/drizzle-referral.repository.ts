import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { BonusRulesSchema } from '#shared/schemas/program'
import { DB, type Database } from '../../database/database.module'
import { customerProfiles, loyaltyCards, programs, referrals, shops } from '../../database/schema'
import { type CaptureAttempt, type CaptureOutcome, ReferralRepository } from './referral.repository'

@Injectable()
export class DrizzleReferralRepository extends ReferralRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findOwnReferralCode(customerId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ referralCode: customerProfiles.referralCode })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, customerId))
      .limit(1)
    return row?.referralCode ?? null
  }

  async capture({ referredId, referralCode, shopCode }: CaptureAttempt): Promise<CaptureOutcome> {
    return this.db.transaction(async (tx) => {
      const [referred] = await tx.select({ id: customerProfiles.userId }).from(customerProfiles).where(eq(customerProfiles.userId, referredId)).limit(1)
      if (!referred) return 'noProfile'

      const [referrer] = await tx.select({ id: customerProfiles.userId }).from(customerProfiles).where(eq(customerProfiles.referralCode, referralCode)).limit(1)
      if (!referrer) return 'unknownReferrer'
      if (referrer.id === referredId) return 'selfReferral'

      const [shop] = await tx
        .select({ id: shops.id, bonusRules: programs.bonusRules })
        .from(shops)
        .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
        .where(and(eq(shops.checkInCode, shopCode), eq(shops.status, 'approved')))
        .limit(1)
      if (!shop) return 'unknownShop'
      const bonusRules = BonusRulesSchema.safeParse(shop.bonusRules)
      if (!bonusRules.success || !bonusRules.data.referralBonus.enabled) return 'referralDisabled'

      const [existingCard] = await tx
        .select({ id: loyaltyCards.id })
        .from(loyaltyCards)
        .where(and(eq(loyaltyCards.shopId, shop.id), eq(loyaltyCards.customerId, referredId)))
        .limit(1)
      if (existingCard) return 'alreadyCustomer'

      const inserted = await tx
        .insert(referrals)
        .values({ shopId: shop.id, referrerId: referrer.id, referredId })
        .onConflictDoNothing({ target: [referrals.shopId, referrals.referredId] })
        .returning({ id: referrals.id })
      return inserted.length > 0 ? 'captured' : 'alreadyReferred'
    })
  }
}
