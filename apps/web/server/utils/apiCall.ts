import { getRequestHeaders, getRequestIP, setResponseHeaders, setResponseStatus, type H3Event } from 'h3'
import type { ApiCall } from '../types/api'
import { failWith } from './authResponse'
import { readBffConfig } from './serverConfig'
import { resolveAccessToken } from './sessionAccess'
import { buildUpstreamUrl, requestHeadersFor, responseHeadersFor } from './upstream'

const NO_CONTENT = 204

function searchOf(query: ApiCall['query']): string {
  if (query === undefined) return ''
  const search = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])).toString()
  return search === '' ? '' : `?${search}`
}

/** Chama a API em nome do cliente logado (cookie -> Bearer) e devolve status, corpo e cabeçalhos seguros. */
export async function callApi(event: H3Event, call: ApiCall): Promise<unknown> {
  const config = readBffConfig()
  const token = await resolveAccessToken(event, { secure: config.secureCookies })
  if (!token.ok) return failWith(event, token.code)

  const bff = { secret: config.bffSharedSecret, clientIp: getRequestIP(event, { xForwardedFor: true }) }
  const forwarded = requestHeadersFor(new Headers(getRequestHeaders(event) as Record<string, string>), token.value, bff)
  const { 'content-type': _browserType, ...headers } = forwarded
  const hasBody = call.body !== undefined

  const response = await fetch(buildUpstreamUrl({ baseUrl: config.apiBaseUrl, path: call.path, search: searchOf(call.query) }), {
    method: call.method,
    headers: hasBody ? { ...headers, 'content-type': 'application/json' } : headers,
    ...(hasBody ? { body: JSON.stringify(call.body) } : {}),
  }).catch(() => null)
  if (response === null) return failWith(event, 'network')

  setResponseStatus(event, response.status)
  setResponseHeaders(event, responseHeadersFor(response.headers))
  return response.status === NO_CONTENT ? null : Buffer.from(await response.arrayBuffer())
}
