import type { CheckInService } from './CheckInService'
import type { AccountService } from './AccountService'
import type { DataExportService } from './DataExportService'
import type { DiscoverService } from './DiscoverService'
import type { ProfileService } from './ProfileService'
import type { RankingService } from './RankingService'
import type { ReferralService } from './ReferralService'
import type { RewardRedemptionService } from './RewardRedemptionService'
import type { WalletService } from './WalletService'

/** Tudo que a superfície consome; a implementação (mock ou http) é escolhida no plugin. */
export interface CustomerServices {
  readonly wallet: WalletService
  readonly checkIn: CheckInService
  readonly redemption: RewardRedemptionService
  readonly discover: DiscoverService
  readonly profile: ProfileService
  readonly referral: ReferralService
  readonly dataExport: DataExportService
  readonly ranking: RankingService
  readonly account: AccountService
}
