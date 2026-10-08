import type { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { CustomerServices } from '../CustomerServices'
import { HttpCheckInService } from './HttpCheckInService'
import { HttpAccountService } from './HttpAccountService'
import { HttpDataExportService } from './HttpDataExportService'
import { HttpDiscoverService } from './HttpDiscoverService'
import { HttpProfileService } from './HttpProfileService'
import { HttpRankingService } from './HttpRankingService'
import { HttpReferralService } from './HttpReferralService'
import { HttpRewardRedemptionService } from './HttpRewardRedemptionService'
import { HttpSessionService } from './HttpSessionService'
import { HttpWalletService } from './HttpWalletService'

export function createHttpCustomerServices(api: ApiClient, newIdempotencyKey: () => string): CustomerServices {
  return {
    wallet: new HttpWalletService(api),
    checkIn: new HttpCheckInService(api, newIdempotencyKey),
    redemption: new HttpRewardRedemptionService(api),
    discover: new HttpDiscoverService(api),
    profile: new HttpProfileService(api),
    referral: new HttpReferralService(api),
    dataExport: new HttpDataExportService(api),
    ranking: new HttpRankingService(api),
    account: new HttpAccountService(api),
    session: new HttpSessionService(api),
  }
}
