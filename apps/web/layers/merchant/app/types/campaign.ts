import type { CampaignOverview, ReminderBonusLimits, ReminderDraft } from '#shared/schemas/campaign'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { CampaignOverviewError, SendReminderError } from '../services/CampaignService'
import type { ComputedRef, Ref } from 'vue'

export interface ReachLine {
  readonly key: 'lapsed' | 'withoutConsent' | 'expired' | 'alreadyReminded'
  readonly icon: string
  readonly text: string
}

export interface ReachModel {
  readonly reachable: number
  readonly headline: string
  readonly lines: readonly ReachLine[]
  /** Explica por que ninguém recebe agora; `null` quando alguém recebe. */
  readonly emptyHint: string | null
}

export interface ReminderPreviewModel {
  readonly shopName: string
  readonly message: string
  /** "+1 carimbo de presente no seu cartão"; `null` sem bônus. */
  readonly bonus: string | null
}

export interface CampaignHistoryRow {
  readonly id: string
  readonly sentAt: string
  readonly recipients: string
  readonly bonus: string
  readonly message: string
}

export type ReminderField = 'message' | 'bonusUnits'

export type ReminderFieldErrors = Partial<Record<ReminderField, true>>

export interface ReminderFieldsLabels {
  readonly message: string
  readonly messageHint: string
  readonly messageError: string
  readonly bonus: string
  readonly bonusHint: string
  readonly bonusError: string
}

export interface ReminderFieldLimits {
  readonly messageMax: number
  readonly bonusMin: number
  readonly bonusMax: number
}

export type ReminderSendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; recipientsCount: number }
  | { status: 'error'; code: SendReminderError['code'] }

export interface Campaigns {
  state: ComputedRef<AsyncResultState<CampaignOverview, CampaignOverviewError>>
  draft: Ref<ReminderDraft>
  bonusLimits: ComputedRef<ReminderBonusLimits | null>
  /** Só aparecem depois da primeira tentativa de mandar. */
  fieldErrors: ComputedRef<ReminderFieldErrors>
  reachable: ComputedRef<number>
  sendState: Readonly<Ref<ReminderSendState>>
  reload: () => Promise<void>
  /** Confere o rascunho antes de pedir a confirmação; `false` mostra os erros. */
  validate: () => boolean
  /** `expectedRecipients` é o número que o lojista viu ao confirmar. */
  send: (expectedRecipients: number) => Promise<void>
}
