import type { CustomerSession, MerchantSession } from '#shared/schemas/session'

/** Quem está logado. Services recebem isto no construtor; nunca leem store/cookie direto. */
export interface SessionProvider<S> {
  current(): S | null
}

export type CustomerSessionProvider = SessionProvider<CustomerSession>
export type MerchantSessionProvider = SessionProvider<MerchantSession>
