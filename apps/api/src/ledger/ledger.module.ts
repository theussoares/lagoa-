import { Module } from '@nestjs/common'
import { LedgerStore } from './ledger.store'

@Module({ providers: [LedgerStore], exports: [LedgerStore] })
export class LedgerModule {}
