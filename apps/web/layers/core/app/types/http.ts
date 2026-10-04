import type { Result } from '#shared/types/result'
import type { DomainError } from '#shared/types/errors'

/** O que o cliente HTTP precisa do mundo: tudo injetado, nada de browser aqui dentro. */
export interface ApiClientDeps {
  readonly baseUrl: string
  readonly fetcher: typeof fetch
  /** Token de acesso da sessão atual (renovado pelo provedor de login); `null` = sem sessão. */
  readonly accessToken: () => Promise<string | null>
  /** Chamado quando a API diz `401`: a sessão local não vale mais. */
  readonly onUnauthorized: () => void
}

export interface ApiRequestOptions {
  readonly body?: unknown
  readonly headers?: Readonly<Record<string, string>>
}

export type ApiResult<T> = Result<T, DomainError>
