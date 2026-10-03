import { Module } from '@nestjs/common'
import { SessionModule } from '../session/session.module'
import { DrizzleRegistrationRepository } from './drizzle-registration.repository'
import { RegistrationController } from './registration.controller'
import { RegistrationRepository } from './registration.repository'
import { RegistrationService } from './registration.service'

@Module({
  imports: [SessionModule],
  controllers: [RegistrationController],
  providers: [RegistrationService, { provide: RegistrationRepository, useClass: DrizzleRegistrationRepository }],
})
export class RegistrationModule {}
