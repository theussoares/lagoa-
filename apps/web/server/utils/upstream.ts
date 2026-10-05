import type { UpstreamTarget } from '../types/auth'

const API_PREFIX = '/api/v1'

/** O navegador só escolhe o caminho e a query; o host da API vem da configuração do servidor. */
export function buildUpstreamUrl({ baseUrl, path, search }: UpstreamTarget): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}${search}`
}

/** `/api/v1/customer/cards?x=1` -> `{ path: '/customer/cards', search: '?x=1' }`; `null` se não for do proxy. */
export function splitProxyPath(url: string): { path: string; search: string } | null {
  const queryStart = url.indexOf('?')
  const pathname = queryStart === -1 ? url : url.slice(0, queryStart)
  const search = queryStart === -1 ? '' : url.slice(queryStart)
  if (!pathname.startsWith(`${API_PREFIX}/`)) return null
  const path = pathname.slice(API_PREFIX.length)
  return path.split('/').some((segment) => segment === '..' || segment === '.') ? null : { path, search }
}

const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language', 'idempotency-key'] as const
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'retry-after', 'cache-control', 'content-disposition', 'content-language'] as const

function pick(source: Headers, names: readonly string[]): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const name of names) {
    const value = source.get(name)
    if (value !== null) picked[name] = value
  }
  return picked
}

/** Quem fala com a API em nome do navegador: o segredo prova que é o BFF, o IP diz quem é o cliente (limite por IP). */
export interface BffIdentity {
  readonly secret: string
  readonly clientIp: string | undefined
}

/** Lista fechada: cookie, origem e qualquer cabeçalho de autenticação do navegador nunca chegam à API. */
export function requestHeadersFor(incoming: Headers, accessToken: string, bff?: BffIdentity): Record<string, string> {
  const headers = { ...pick(incoming, FORWARDED_REQUEST_HEADERS), authorization: `Bearer ${accessToken}` }
  if (bff === undefined || bff.secret === '') return headers
  return { ...headers, 'x-bff-secret': bff.secret, ...(bff.clientIp === undefined ? {} : { 'x-client-ip': bff.clientIp }) }
}

/** Idem para a volta: nada de `set-cookie` nem `access-control-*` da API. */
export function responseHeadersFor(upstream: Headers): Record<string, string> {
  return pick(upstream, FORWARDED_RESPONSE_HEADERS)
}
