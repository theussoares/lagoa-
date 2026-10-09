import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { CampaignOverviewSchema, CampaignSchema, type ReminderDraft } from '#shared/schemas/campaign'
import type { CampaignService } from '../CampaignService'

export class HttpCampaignService implements CampaignService {
  constructor(private readonly api: ApiClient) {}

  async getOverview() {
    const res = await this.api.get('/merchant/campaigns/overview', CampaignOverviewSchema)
    return allowing('notFound')(res)
  }

  async sendReminder(draft: ReminderDraft, expectedRecipients: number) {
    const res = await this.api.post('/merchant/campaigns/reminders', CampaignSchema, {
      body: { draft, expectedRecipients },
    })
    return allowing(
      'invalidCampaign',
      'noReachableCustomers',
      'reachChanged',
      'notFound',
      'shopPendingApproval',
      'shopSuspended',
    )(res)
  }
}
