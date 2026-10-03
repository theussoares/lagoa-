import { Module } from '@nestjs/common'
import { DrizzleWalletRepository } from './drizzle-wallet.repository'
import { WalletController } from './wallet.controller'
import { WalletRepository } from './wallet.repository'
import { WalletService } from './wallet.service'

@Module({
  controllers: [WalletController],
  providers: [WalletService, { provide: WalletRepository, useClass: DrizzleWalletRepository }],
})
export class WalletModule {}
