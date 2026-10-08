import type { CustomerSession } from '#shared/schemas/session'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

/** Quem é a pessoa do cookie de sessão. `null` = ninguém logado (sem cookie, vencido ou ainda sem cadastro). */
export interface SessionService {
  restore(): Promise<Result<CustomerSession | null, TransportError>>
}
