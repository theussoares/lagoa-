import { createError, getRequestHeader, getRequestURL } from 'h3'
import { isTrustedOrigin } from '../utils/originGuard'
import { readBffConfig } from '../utils/serverConfig'

/** CSRF do cookie de sessão em `/api/**`: escrita só do próprio site ou de uma origem liberada. */
export default defineEventHandler((event) => {
  if (!getRequestURL(event).pathname.startsWith('/api/')) return
  const trusted = isTrustedOrigin({
    method: event.method,
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host'),
    allowedOrigins: readBffConfig().allowedOrigins,
  })
  if (!trusted) throw createError({ statusCode: 403, data: { code: 'forbidden' } })
})
