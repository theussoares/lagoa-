import type { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { MerchantServices } from '../MerchantServices'
import { HttpCampaignService } from './HttpCampaignService'
import { HttpClubSetupService } from './HttpClubSetupService'
import { HttpCounterService } from './HttpCounterService'
import { HttpMerchantCustomersService } from './HttpMerchantCustomersService'
import { HttpMerchantHomeService } from './HttpMerchantHomeService'
import { HttpPosterReprintService } from './HttpPosterReprintService'
import { HttpProgramService } from './HttpProgramService'
import { HttpVisitQrService } from './HttpVisitQrService'

export function createHttpMerchantServices(api: ApiClient): MerchantServices {
  const clubSetup = new HttpClubSetupService(api)
  return {
    counter: new HttpCounterService(api),
    visitQr: new HttpVisitQrService(api),
    customers: new HttpMerchantCustomersService(api),
    program: new HttpProgramService(api),
    campaigns: new HttpCampaignService(api),
    home: new HttpMerchantHomeService(api),
    clubSetup,
    poster: clubSetup,
    posterReprint: new HttpPosterReprintService(),
    shopStatus: clubSetup,
    shopApprovalTesting: null,
    visitQrTesting: null,
  }
}
