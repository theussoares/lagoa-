import type { Ref } from 'vue'
import type { RedemptionTicketState } from '#layers/ui/app/types/redemption'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { Redemption } from '#shared/schemas/redemption'
import type { RequestRedemptionCodeError } from '../services/RewardRedemptionService'

export type RewardRedemptionError = RequestRedemptionCodeError

export type RewardRedemptionState =
  | { status: 'loading' }
  | { status: 'error'; error: RewardRedemptionError }
  | { status: 'ready'; redemption: Redemption }

export interface RewardRedemption {
  state: Readonly<Ref<RewardRedemptionState>>
  /** Segundos até o código vencer; o servidor continua sendo quem decide. */
  remaining: Readonly<Ref<number>>
  /** Gera um código novo (ou recupera o que ainda vale). */
  request: () => Promise<void>
}

export interface RewardRedemptionBack {
  readonly to: string
  readonly label: string
}

export interface RewardRedemptionScreen {
  readonly state: RewardRedemptionState
  readonly card: WalletCard | undefined
  readonly redemption: Redemption | undefined
  readonly ticket: RedemptionTicketState | undefined
  readonly announcement: string
  readonly heldUntil: string | null
  readonly errorText: string
  readonly title: string
  readonly back: RewardRedemptionBack
  readonly canRetry: boolean
  readonly request: () => Promise<void>
  readonly cityHeaderImage: string
}
