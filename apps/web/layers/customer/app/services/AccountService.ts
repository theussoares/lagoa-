import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface AccountService {
  /** Direito de eliminação (LGPD). Sem volta: quem chama confirma com a pessoa antes. */
  eraseAccount(): Promise<Result<void, TransportError>>
}
