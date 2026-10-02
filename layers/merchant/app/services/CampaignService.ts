import type { Campaign, CampaignOverview, ReminderDraft } from '#shared/schemas/campaign'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { ShopClosedError } from './CounterService'

export type CampaignOverviewError = ErrorOf<'notFound'> | TransportError
export type SendReminderError =
  | ErrorOf<'invalidCampaign' | 'noReachableCustomers' | 'reachChanged' | 'notFound'>
  | ShopClosedError
  | TransportError

export interface CampaignService {
  /** Alcance só em números e histórico de envios; nenhum celular sai daqui. */
  /** `notFound` (programa) enquanto a loja não criou o clube. */
  getOverview(): Promise<Result<CampaignOverview, CampaignOverviewError>>
  /**
   * O servidor refaz o alcance no envio (consentimento vale no momento em que sai)
   * e recusa com `reachChanged` se não bater com o número que o lojista confirmou.
   */
  sendReminder(draft: ReminderDraft, expectedRecipients: number): Promise<Result<Campaign, SendReminderError>>
}
