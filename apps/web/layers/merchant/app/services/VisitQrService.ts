import type { VisitQrId } from '#shared/schemas/ids'
import type { IssuedVisitQr, VisitQr, VisitQrIssueRequest } from '#shared/schemas/visitQr'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { ShopClosedError, TermsPendingError } from './CounterService'

export type IssueVisitQrError = ErrorOf<'invalidAmount' | 'amountNotAccepted' | 'visitQrLimitReached'> | ShopClosedError | TermsPendingError | TransportError
/** QR de outra loja responde como inexistente. */
export type VisitQrLookupError = ErrorOf<'notFound'> | ShopClosedError | TransportError

/** QR da visita no Balcão: o lojista gera na hora da venda, acompanha o uso e cancela. */
export interface VisitQrService {
  /** Só esta resposta leva o token (o servidor guarda o hash); o app o mantém em memória e nunca o grava. */
  issueVisitQr(request: VisitQrIssueRequest): Promise<Result<IssuedVisitQr, IssueVisitQrError>>
  getVisitQr(id: VisitQrId): Promise<Result<VisitQr, VisitQrLookupError>>
  /** Idempotente: QR que não está ativo volta como está (cancelar `claimed` não desfaz o ganho, RN-10). */
  cancelVisitQr(id: VisitQrId): Promise<Result<VisitQr, VisitQrLookupError>>
}

/** Só no mock (como `ShopApprovalTestingService`): simula o uso por um cliente do seed (RN-22). */
export interface VisitQrTestingService {
  simulateClaim(id: VisitQrId): Promise<Result<VisitQr, VisitQrLookupError>>
}
