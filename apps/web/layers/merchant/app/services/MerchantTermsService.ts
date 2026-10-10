import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

/** `merchantTermsNotAccepted`: a versão mostrada não é mais a atual (texto novo entrou); recarregar a tela. */
export type MerchantTermsError = ErrorOf<'merchantTermsNotAccepted' | 'notFound'> | TransportError

/** Aceite do termo do lojista: a tela manda a versão que mostrou e o servidor grava versão e data. */
export interface MerchantTermsService {
  accept(version: string): Promise<Result<void, MerchantTermsError>>
}
