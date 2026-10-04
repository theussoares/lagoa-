import { Module } from '@nestjs/common'
import { LedgerStore } from './ledger.store'
import { RedemptionLookup } from './redemption-lookup'

@Module({ providers: [LedgerStore, RedemptionLookup], exports: [LedgerStore, RedemptionLookup] })
export class LedgerModule {}
