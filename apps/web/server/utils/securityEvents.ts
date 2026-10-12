import type { SecurityEvent } from '#shared/types/securityEvent'

export interface BffRequestInfo {
  readonly method: string
  readonly url: URL
  readonly requestId: string | undefined
}

/** Evento do BFF a partir do pedido: só o caminho (sem query, que poderia carregar dado) e o id da plataforma. */
export function bffSecurityEvent(request: BffRequestInfo, entry: Pick<SecurityEvent, 'event' | 'outcome' | 'code' | 'userId'>): SecurityEvent {
  return { ...entry, method: request.method, route: request.url.pathname, requestId: request.requestId }
}
