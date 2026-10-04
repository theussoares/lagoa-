import { Module } from '@nestjs/common'
import { AccountController } from './account.controller'
import { AccountRepository } from './account.repository'
import { AccountService } from './account.service'
import { DrizzleAccountRepository } from './drizzle-account.repository'

@Module({
  controllers: [AccountController],
  providers: [AccountService, { provide: AccountRepository, useClass: DrizzleAccountRepository }],
})
export class AccountModule {}
