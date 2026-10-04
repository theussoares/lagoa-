import type { CheckInService } from './CheckInService'
import type { DiscoverService } from './DiscoverService'
import type { ProfileService } from './ProfileService'
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
}
