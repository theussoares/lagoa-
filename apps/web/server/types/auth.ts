export interface TokenPair {
  readonly accessToken: string
  readonly refreshToken: string
  /** Segundos de vida do access token, como o Supabase devolve. */
  readonly expiresIn: number
  /** `sub` do token (id opaco da conta): só para o log de segurança, nunca vai para cookie nem resposta. */
  readonly userId: string
}

/** Código que o front já entende (`parseDomainError`); o status HTTP sai dele em `authErrorStatus`. */
export type AuthErrorCode = 'rateLimited' | 'network' | 'internal' | 'invalidLoginCode' | 'loginCodeExpired' | 'invalidPhone' | 'unauthorized'

export type AuthOutcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly code: AuthErrorCode }

/** O que o servidor de login (Supabase Auth) devolve de erro, sem acoplar ao SDK. */
export interface ProviderError {
  readonly status?: number
  readonly code?: string
}

export interface CookieSettings {
  readonly secure: boolean
}

export interface UpstreamTarget {
  readonly baseUrl: string
  readonly path: string
  readonly search: string
}
