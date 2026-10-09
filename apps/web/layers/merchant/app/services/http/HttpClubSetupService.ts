import { z } from 'zod'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { ok } from '#shared/types/result'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { MerchantSessionSchema, type SignUpTicket } from '#shared/schemas/session'
import { ShopPosterSchema, ShopStatusSchema } from '#shared/schemas/shop'
import type {
  ClubSetupService,
  ShopApprovalTestingService,
  ShopPosterService,
  ShopStatusService,
} from '../ClubSetupService'

export class HttpClubSetupService
  implements ClubSetupService, ShopPosterService, ShopStatusService, ShopApprovalTestingService
{
  constructor(private readonly api: ApiClient) {}

  async createClub(ticket: SignUpTicket, draft: ClubSetupDraft) {
    const res = await this.api.post('/merchant/club-setup', MerchantSessionSchema, { body: draft })
    return allowing('signUpExpired', 'invalidClubSetup')(res)
  }

  async getPoster() {
    const res = await this.api.get('/merchant/poster', ShopPosterSchema)
    return allowing('notFound')(res)
  }

  async getStatus() {
    const res = transportOnly(await this.api.get('/merchant/shop/status', z.object({ status: ShopStatusSchema })))
    if (!res.ok) return res
    return ok(res.value.status)
  }

  async approveCurrentShop() {
    const res = transportOnly(
      await this.api.post('/merchant/shop/test-approve', z.object({ status: ShopStatusSchema }), { body: {} }),
    )
    if (!res.ok) return res
    return ok(res.value.status)
  }
}
