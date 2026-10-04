import type { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { CustomerServices } from '../CustomerServices'
import { HttpCheckInService } from './HttpCheckInService'
import { HttpDiscoverService } from './HttpDiscoverService'
import { HttpProfileService } from './HttpProfileService'
import { HttpReferralService } from './HttpReferralService'
import { HttpRewardRedemptionService } from './HttpRewardRedemptionService'
import { HttpWalletService } from './HttpWalletService'

export function createHttpCustomerServices(api: ApiClient, newIdempotencyKey: () => string): CustomerServices {
  return {
    wallet: new HttpWalletService(api),
    checkIn: new HttpCheckInService(api, newIdempotencyKey),
    redemption: new HttpRewardRedemptionService(api),
    discover: new HttpDiscoverService(api),
    profile: new HttpProfileService(api),
    referral: new HttpReferralService(api),
  }
}
