import { z } from 'zod'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { err, ok, type Result } from '#shared/types/result'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { MerchantSessionSchema, type MerchantSession } from '#shared/schemas/session'
import { ShopPosterSchema, ShopStatusSchema } from '#shared/schemas/shop'
import type {
  ClubSetupService,
  CreateClubError,
  ShopPosterService,
  ShopStatusService,
} from '../ClubSetupService'

export class HttpClubSetupService
  implements ClubSetupService, ShopPosterService, ShopStatusService
{
  constructor(private readonly api: ApiClient) {}

  async createClub(draft: ClubSetupDraft): Promise<Result<MerchantSession, CreateClubError>> {
    const res = await this.api.post('/merchant/club-setup', MerchantSessionSchema, { body: draft })
    // Sem sessão no servidor = o celular precisa ser confirmado de novo.
    if (!res.ok && res.error.code === 'unauthorized') return err({ code: 'signUpExpired' })
    return allowing('invalidClubSetup')(res)
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
}
