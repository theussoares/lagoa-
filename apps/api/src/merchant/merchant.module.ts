import { Module } from '@nestjs/common'
import { ClubSetupModule } from './club-setup/club-setup.module'
import { CounterModule } from './counter/counter.module'
import { ProgramModule } from './program/program.module'
import { SessionModule } from './session/session.module'
import { VisitQrsModule } from './visit-qrs/visit-qrs.module'

@Module({
  imports: [SessionModule, ClubSetupModule, CounterModule, ProgramModule, VisitQrsModule],
  exports: [SessionModule, ClubSetupModule, CounterModule, ProgramModule, VisitQrsModule],
})
export class MerchantModule {}


