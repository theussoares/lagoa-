export interface SurfaceHosts {
  /** Origem do app do cliente (ex.: https://app.lagoamais.com.br). Vazio desliga a separação. */
  readonly customerUrl: string
  /** Origem do Balcão (ex.: https://balcao.lagoamais.com.br). Vazio desliga a separação. */
  readonly merchantUrl: string
}

export interface SurfaceRequest {
  readonly method: string
  readonly host: string | undefined
  /** Caminho com a query (`/premios?x=1`). */
  readonly pathAndQuery: string
}

const MERCHANT_PATHS = ['/painel', '/configuracoes', '/campanhas', '/balcao', '/programa', '/hits', '/botao-do-card', '/clientes']
const CUSTOMER_PATHS = ['/carteira', '/descobrir', '/premios', '/check-in', '/ranking', '/convite', '/perfil', '/entrar']

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

function pathIsUnder(pathname: string, roots: readonly string[]): boolean {
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
}

/**
 * O mesmo deploy atende o app do cliente e o Balcão; cada host só mostra a sua superfície. Devolve para onde mandar
 * quem abriu a página no host errado (ou a raiz do Balcão), ou `null` quando não há o que mudar. Só navegação (GET/HEAD).
 */
export function surfaceRedirect({ customerUrl, merchantUrl }: SurfaceHosts, { method, host, pathAndQuery }: SurfaceRequest): string | null {
  if (method !== 'GET' && method !== 'HEAD') return null
  const customerHost = hostOf(customerUrl)
  const merchantHost = hostOf(merchantUrl)
  if (customerHost === null || merchantHost === null || host === undefined) return null
  const pathname = pathAndQuery.split('?')[0] ?? pathAndQuery

  if (host === merchantHost) {
    if (pathname === '/') return `${merchantUrl}/balcao`
    return pathIsUnder(pathname, CUSTOMER_PATHS) ? `${customerUrl}${pathAndQuery}` : null
  }
  if (host === customerHost) return pathIsUnder(pathname, MERCHANT_PATHS) ? `${merchantUrl}${pathAndQuery}` : null
  return null
}
