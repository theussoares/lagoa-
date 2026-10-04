import { Module } from '@nestjs/common'
import { ProfileModule } from '../profile/profile.module'
import { DrizzleReferralRepository } from './drizzle-referral.repository'
import { ReferralController } from './referral.controller'
import { ReferralRepository } from './referral.repository'
import { ReferralService } from './referral.service'

@Module({
  imports: [ProfileModule],
  controllers: [ReferralController],
  providers: [ReferralService, { provide: ReferralRepository, useClass: DrizzleReferralRepository }],
})
export class ReferralModule {}
