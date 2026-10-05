const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export interface OriginCheck {
  readonly method: string
  /** Cabeçalho `Origin`; navegadores sempre mandam em requisição que muda estado. */
  readonly origin: string | undefined
  /** Host que o navegador acessou (`x-forwarded-host` atrás da Vercel). */
  readonly host: string | undefined
  readonly allowedOrigins: readonly string[]
}

/** `ALLOWED_ORIGINS` aceita várias origens separadas por vírgula; espaços e barra final não contam. */
export function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0)
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

/**
 * Defesa de CSRF do cookie de sessão: quem muda estado precisa vir do próprio site (mesmo host) ou de uma origem
 * liberada na lista. Leitura passa; `Origin` ausente ou ilegível em escrita é recusado.
 */
export function isTrustedOrigin({ method, origin, host, allowedOrigins }: OriginCheck): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true
  if (origin === undefined) return false
  if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) return true
  const originHost = hostOf(origin)
  return originHost !== null && host !== undefined && originHost === host
}
