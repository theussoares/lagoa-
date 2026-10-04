import { z } from 'zod'
import { ReferralInviteSchema, type ReferralCapture } from '#shared/schemas/referral'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { ReferralService } from '../ReferralService'

export class HttpReferralService implements ReferralService {
  constructor(private readonly api: ApiClient) {}

  async capture(invite: ReferralCapture) {
    return transportOnly(await this.api.post('/referrals', z.undefined(), { body: invite }))
  }

  async getInvite() {
    return transportOnly(await this.api.get('/referrals/me', ReferralInviteSchema))
  }
}
