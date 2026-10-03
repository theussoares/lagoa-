import type { RedemptionStatus } from '#shared/schemas/redemption'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface RedemptionRecord {
  readonly id: string
  readonly code: string
  readonly cardId: string
  readonly shopId: string
  /** Título guardado na hora do pedido (snapshot): mudar o prêmio depois não altera o código gerado. */
  readonly rewardTitle: string
  readonly status: RedemptionStatus
  readonly createdAt: Date
  readonly expiresAt: Date
}

export interface RedemptionRequestState {
  readonly balance: number
  readonly target: number
  /** Código ativo que o cartão já tem (no máximo um). */
  readonly active: { readonly id: string; readonly expiresAt: Date } | null
}

export type RequestDecision =
  | { readonly kind: 'notReady'; readonly remaining: number }
  | { readonly kind: 'reuse' }
  /** `expireStaleId`: o código ativo que já venceu e precisa sair do caminho antes de gerar outro. */
  | { readonly kind: 'create'; readonly expireStaleId: string | null }

export interface RedemptionRequestAttempt {
  readonly customerId: string
  readonly cardId: string
  readonly expiresAt: Date
  readonly newCode: () => string
}

export abstract class RedemptionRepository {
  /**
   * Trava o cartão do cliente, deixa `decide` escolher e grava (ou devolve) o código na mesma
   * transação: dois pedidos simultâneos acabam com o mesmo código ativo.
   */
  abstract request(
    attempt: RedemptionRequestAttempt,
    decide: (state: RedemptionRequestState) => RequestDecision,
  ): Promise<Result<RedemptionRecord, ErrorOf<'notFound'> | ErrorOf<'rewardNotReady'>>>

  /** Só o código de um cartão do próprio cliente. O vencido sai marcado como `expired`. */
  abstract find(customerId: string, redemptionId: string, now: Date): Promise<RedemptionRecord | null>
}
