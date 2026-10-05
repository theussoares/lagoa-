import { getRequestHeaders, getRequestIP, getRequestURL, readRawBody, setResponseHeaders, setResponseStatus, type H3Event } from 'h3'
import { buildUpstreamUrl, requestHeadersFor, responseHeadersFor, splitProxyPath } from './upstream'
import { failWith } from './authResponse'

export interface ApiUpstream {
  readonly baseUrl: string
  readonly bffSecret: string
}

const BODYLESS_METHODS = new Set(['GET', 'HEAD'])

async function readBody(event: H3Event, method: string): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (BODYLESS_METHODS.has(method)) return undefined
  const raw = await readRawBody(event, false)
  return raw === undefined ? undefined : Uint8Array.from(raw)
}

/** Repassa a chamada do navegador para a API, já com o Bearer; devolve status, corpo e cabeçalhos seguros de volta. */
export async function forwardToApi(event: H3Event, upstream: ApiUpstream, accessToken: string): Promise<unknown> {
  const url = getRequestURL(event)
  const target = splitProxyPath(`${url.pathname}${url.search}`)
  if (target === null) return failWith(event, 'internal')

  const method = event.method.toUpperCase()
  const body = await readBody(event, method)
  const bff = { secret: upstream.bffSecret, clientIp: getRequestIP(event, { xForwardedFor: true }) }
  const headers = requestHeadersFor(new Headers(getRequestHeaders(event) as Record<string, string>), accessToken, bff)

  const response = await fetch(buildUpstreamUrl({ baseUrl: upstream.baseUrl, ...target }), { method, headers, body }).catch(() => null)
  if (response === null) return failWith(event, 'network')

  setResponseStatus(event, response.status)
  setResponseHeaders(event, responseHeadersFor(response.headers))
  return response.status === 204 ? null : Buffer.from(await response.arrayBuffer())
}
