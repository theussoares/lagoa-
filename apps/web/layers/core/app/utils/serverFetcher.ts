import type { ServerFetcherOptions } from '../types/http'

/**
 * `fetch` para o SSR: chama o próprio `/api` (BFF) em memória, com o cookie do pedido, e devolve a `Response`
 * que o `ApiClient` trata igual ao navegador. O `Set-Cookie` do BFF (refresh do token) volta para a resposta da página.
 */
export function createServerFetcher({ localFetch, forwarded, onSetCookie }: ServerFetcherOptions): typeof fetch {
  return async (input, init) => {
    const response = await localFetch(String(input), { ...init, headers: { ...forwarded, ...(init?.headers as Record<string, string> | undefined) } })
    for (const cookie of response.headers.getSetCookie()) onSetCookie(cookie)
    return response
  }
}
