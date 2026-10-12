/** Eventos de segurança (SECURITY_RULES §14). O login acontece no BFF; acesso negado e limite, na API. */
export type SecurityEventName =
  | 'auth.codeRequested'
  | 'auth.login'
  | 'auth.logout'
  | 'access.unauthorized'
  | 'access.denied'
  | 'rateLimit.hit'

/**
 * Uma linha de log por evento. Só ids opacos e rotas-padrão: nunca celular, código, token, cookie nem IP. `route` é o
 * caminho do handler (`/v1/redemptions/:id`), nunca a URL real, que pode carregar dado.
 */
export interface SecurityEvent {
  readonly event: SecurityEventName
  readonly outcome: 'success' | 'failure'
  readonly method: string
  readonly route: string
  /** Código do erro devolvido (`invalidLoginCode`, `shopSuspended`, `rateLimited`). */
  readonly code?: string
  readonly userId?: string
  /** Id do pedido no provedor (`x-vercel-id`), para cruzar com o log da plataforma. */
  readonly requestId?: string
}
