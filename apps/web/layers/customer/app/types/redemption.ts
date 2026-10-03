import type { Ref } from 'vue'
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
