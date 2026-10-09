import { Module } from '@nestjs/common'
import { SessionModule } from '../session/session.module'
import { CustomersController } from './customers.controller'
import { CustomersRepository } from './customers.repository'
import { CustomersService } from './customers.service'
import { DrizzleCustomersRepository } from './drizzle-customers.repository'

@Module({
  imports: [SessionModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    {
      provide: CustomersRepository,
      useClass: DrizzleCustomersRepository,
    },
  ],
  exports: [CustomersService, CustomersRepository],
})
export class CustomersModule {}
