import { Module } from '@nestjs/common'
import { ClubSetupModule } from './club-setup/club-setup.module'
import { CounterModule } from './counter/counter.module'
import { SessionModule } from './session/session.module'

@Module({
  imports: [SessionModule, ClubSetupModule, CounterModule],
  exports: [SessionModule, ClubSetupModule, CounterModule],
})
export class MerchantModule {}

