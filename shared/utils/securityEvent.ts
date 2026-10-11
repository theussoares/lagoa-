import type { SecurityEvent } from '../types/securityEvent'

/** JSON numa linha, com `type: 'security'` para filtrar no painel de logs. Campo vazio não sai. */
export function securityLogLine(event: SecurityEvent, at: Date): string {
  return JSON.stringify({ type: 'security', at: at.toISOString(), ...event })
}
