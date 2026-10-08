import type { Result } from '#shared/types/result'
import type { DomainError } from '#shared/types/errors'

/** O que o cliente HTTP precisa do mundo: tudo injetado, nada de browser aqui dentro. O token não passa por aqui: vai no cookie httpOnly, que o servidor do Nuxt troca por Bearer. */
export interface ApiClientDeps {
  readonly baseUrl: string
  readonly fetcher: typeof fetch
  /** Chamado quando a API diz `401`: a sessão local não vale mais. */
  readonly onUnauthorized: () => void
}

export interface ApiRequestOptions {
  readonly body?: unknown
  readonly headers?: Readonly<Record<string, string>>
}

export type ApiResult<T> = Result<T, DomainError>

type LocalFetch = (input: string, init?: RequestInit) => Promise<Response>

export interface ServerFetcherOptions {
  /** Chamada em memória ao próprio servidor (`event.fetch` do Nitro). */
  readonly localFetch: LocalFetch
  /** Cabeçalhos do pedido da página que a API precisa ver: o cookie de sessão e o IP do cliente. */
  readonly forwarded: Readonly<Record<string, string>>
  readonly onSetCookie: (cookie: string) => void
}
