import type { DomainErrorCode } from '#shared/types/errors'

/**
 * Qualquer estado de tela que pode estar em erro: `{ status: 'error', error: { code } }`
 * (resultado de service) ou `{ status: 'error', code }` (estado do composable).
 */
export interface ErrorCarrier {
  readonly status: string
  readonly error?: { readonly code: DomainErrorCode }
  readonly code?: DomainErrorCode
}
