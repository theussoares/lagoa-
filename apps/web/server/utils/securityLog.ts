import { getRequestHeader, getRequestURL, type H3Event } from 'h3'
import type { SecurityEvent } from '#shared/types/securityEvent'
import { securityLogLine } from '#shared/utils/securityEvent'
import { bffSecurityEvent } from './securityEvents'

/** Grava um evento de segurança do BFF (login, logout) no log da plataforma. */
export function logSecurityEvent(event: H3Event, entry: Pick<SecurityEvent, 'event' | 'outcome' | 'code' | 'userId'>): void {
  const request = { method: event.method, url: getRequestURL(event), requestId: getRequestHeader(event, 'x-vercel-id') }
  console.warn(securityLogLine(bffSecurityEvent(request, entry), new Date()))
}
