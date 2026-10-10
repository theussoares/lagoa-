import type { ProgramRules } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import type { VisitQr, VisitQrCancelReason, VisitQrEarn } from '#shared/schemas/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

/** A loja e a versão ativa do programa como estavam quando a emissão as travou. */
export interface LockedShopForIssue {
  readonly status: ShopStatus
  readonly programId: string
  readonly rules: ProgramRules
}

export type IssueDecisionError = ErrorOf<
  'shopPendingApproval' | 'shopSuspended' | 'invalidAmount' | 'amountNotAccepted'
>

export type IssueError = IssueDecisionError | ErrorOf<'notFound' | 'visitQrLimitReached'>

export interface IssueVisitQrCommand {
  readonly shopId: string
  readonly issuedBy: string
  /** Relógio da aplicação (nunca `now()` do banco): é com ele que os vencidos saem da conta do limite. */
  readonly now: Date
  readonly expiresAt: Date
  readonly tokenHash: Buffer
  /** Sorteia um código curto; chamado de novo se colidir com um QR vivo de outra loja. */
  readonly newVisitCode: () => string
  /** Decisão pura sobre a loja travada (aprovada? o valor vale?): roda dentro da transação, com os locks. */
  readonly plan: (shop: LockedShopForIssue) => Result<VisitQrEarn, IssueDecisionError>
}

export interface IssuedRow {
  readonly id: string
  readonly visitCode: string
  readonly earn: VisitQrEarn
}

export abstract class VisitQrsRepository {
  /**
   * Uma transação: trava a loja (`FOR SHARE`, pareia com o `FOR UPDATE` do `PUT /program`), lê a versão ativa,
   * serializa as emissões da loja (advisory lock), vence o que passou do prazo, confere o teto e grava.
   */
  abstract issue(command: IssueVisitQrCommand): Promise<Result<IssuedRow, IssueError>>
  abstract findById(shopId: string, id: string): Promise<VisitQr | null>
  /** Só cancela se ainda estiver vivo; idempotente. Devolve o estado atual. */
  abstract cancel(shopId: string, id: string, reason: VisitQrCancelReason, now: Date): Promise<VisitQr | null>
}
