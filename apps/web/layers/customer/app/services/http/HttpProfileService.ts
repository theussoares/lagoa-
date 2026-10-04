import { CustomerProfileSchema, type ProfileUpdate } from '#shared/schemas/customer'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { ProfileService } from '../ProfileService'

export class HttpProfileService implements ProfileService {
  constructor(private readonly api: ApiClient) {}

  async getProfile() {
    return transportOnly(await this.api.get('/customer/profile', CustomerProfileSchema))
  }

  async updateProfile(update: ProfileUpdate) {
    return allowing('birthdayLocked')(await this.api.put('/customer/profile', CustomerProfileSchema, { body: update }))
  }

  async setNotificationConsent(granted: boolean) {
    return transportOnly(await this.api.put('/customer/profile/consent', CustomerProfileSchema, { body: { granted } }))
  }

  async acceptTerms() {
    return transportOnly(await this.api.post('/customer/profile/terms', CustomerProfileSchema))
  }
}
