import { Module } from '@nestjs/common'
import { CheckInModule } from './check-in/check-in.module'
import { ShopJoinModule } from './shop-join/shop-join.module'
import { DiscoverModule } from './discover/discover.module'
import { DataExportModule } from './data-export/data-export.module'
import { AccountModule } from './account/account.module'
import { RankingModule } from './ranking/ranking.module'
import { ReferralModule } from './referral/referral.module'
import { RedemptionModule } from './redemption/redemption.module'
import { ProfileModule } from './profile/profile.module'
import { RegistrationModule } from './registration/registration.module'
import { SessionModule } from './session/session.module'
import { WalletModule } from './wallet/wallet.module'

/** Superfície do cliente (app mobile). O painel do lojista vive em `merchant/`. */
@Module({ imports: [RegistrationModule, SessionModule, ProfileModule, DiscoverModule, WalletModule, CheckInModule, ShopJoinModule, RedemptionModule, ReferralModule, DataExportModule, RankingModule, AccountModule] })
export class CustomerModule {}
