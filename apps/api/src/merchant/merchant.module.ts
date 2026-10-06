import { Module } from '@nestjs/common'
import { ClubSetupModule } from './club-setup/club-setup.module'
import { SessionModule } from './session/session.module'

@Module({
  imports: [SessionModule, ClubSetupModule],
  exports: [SessionModule, ClubSetupModule],
})
export class MerchantModule {}

