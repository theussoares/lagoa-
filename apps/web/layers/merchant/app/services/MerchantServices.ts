import type { CampaignService } from './CampaignService'
import type { ClubSetupService, ShopApprovalTestingService, ShopPosterService, ShopStatusService } from './ClubSetupService'
import type { CounterService } from './CounterService'
import type { MerchantCustomersService } from './MerchantCustomersService'
import type { MerchantHomeService } from './MerchantHomeService'
import type { PosterReprintService } from './PosterReprintService'
import type { ProgramService } from './ProgramService'
import type { VisitQrService, VisitQrTestingService } from './VisitQrService'

/** Tudo que a superfície consome; a implementação (mock ou http) é escolhida no plugin. */
export interface MerchantServices {
  readonly counter: CounterService
  readonly visitQr: VisitQrService
  readonly customers: MerchantCustomersService
  readonly program: ProgramService
  readonly campaigns: CampaignService
  readonly home: MerchantHomeService
  readonly clubSetup: ClubSetupService
  readonly poster: ShopPosterService
  readonly posterReprint: PosterReprintService
  readonly shopStatus: ShopStatusService
  /** `null` fora do mock. */
  readonly shopApprovalTesting: ShopApprovalTestingService | null
  /** `null` fora do mock. */
  readonly visitQrTesting: VisitQrTestingService | null
}
