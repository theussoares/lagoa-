import { Module } from '@nestjs/common'
import { DrizzleReferralSettlement } from './drizzle-referral-settlement'
import { LedgerStore } from './ledger.store'
import { ReferralSettlement } from './referral-settlement'
import { RedemptionLookup } from './redemption-lookup'

@Module({
  providers: [LedgerStore, RedemptionLookup, { provide: ReferralSettlement, useClass: DrizzleReferralSettlement }],
  exports: [LedgerStore, RedemptionLookup, ReferralSettlement],
})
export class LedgerModule {}
