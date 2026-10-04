import { z } from 'zod'
import type { ShopId } from '#shared/schemas/ids'
import { WalletCardSchema } from '#shared/schemas/loyaltyCard'
import { WalletActivitySchema } from '#shared/schemas/visit'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { WalletService } from '../WalletService'

export class HttpWalletService implements WalletService {
  constructor(private readonly api: ApiClient) {}

  async listCards() {
    return transportOnly(await this.api.get('/wallet/cards', z.array(WalletCardSchema)))
  }

  async getCard(shopId: ShopId) {
    return allowing('notFound')(await this.api.get(`/wallet/cards/${shopId}`, WalletCardSchema))
  }

  async listActivity(limit: number) {
    return transportOnly(await this.api.get(`/wallet/activity?limit=${limit}`, z.array(WalletActivitySchema)))
  }

  async listRewardHistory(limit: number) {
    return transportOnly(await this.api.get(`/wallet/rewards?limit=${limit}`, z.array(WalletActivitySchema)))
  }
}
