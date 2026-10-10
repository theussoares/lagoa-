import { Module } from '@nestjs/common'
import { ClubSetupModule } from './club-setup/club-setup.module'
import { CounterModule } from './counter/counter.module'
import { CustomersModule } from './customers/customers.module'
import { HomeModule } from './home/home.module'
import { MerchantTermsModule } from './terms/terms.module'
import { ProgramModule } from './program/program.module'
import { SessionModule } from './session/session.module'
import { ShopPhotoModule } from './shop-photo/shop-photo.module'
import { VisitQrsModule } from './visit-qrs/visit-qrs.module'

@Module({
  imports: [MerchantTermsModule, SessionModule, ClubSetupModule, CounterModule, ProgramModule, VisitQrsModule, CustomersModule, HomeModule, ShopPhotoModule],
  exports: [MerchantTermsModule, SessionModule, ClubSetupModule, CounterModule, ProgramModule, VisitQrsModule, CustomersModule, HomeModule],
})
export class MerchantModule {}


