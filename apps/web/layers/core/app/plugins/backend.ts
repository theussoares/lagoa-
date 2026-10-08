import { appendResponseHeader } from 'h3'
import { BffPhoneAuthGateway } from '../services/BffPhoneAuthGateway'
import { HttpAuthService } from '../services/HttpAuthService'
import { ApiClient } from '../services/http/ApiClient'
import { BFF_API_BASE } from '../services/http/bffPaths'
import { useSessionStore } from '../stores/session'
import { createServerFetcher } from '../utils/serverFetcher'

/**
 * Único ponto que liga o app à API: tudo passa pelo BFF do Nuxt (`server/api`), que guarda o token em cookie httpOnly.
 * No servidor (SSR) o fetcher chama o BFF em memória com o cookie do pedido; no navegador, o `fetch` normal.
 */
export default defineNuxtPlugin({
  name: 'lagoa:backend',
  setup() {
    const fetcher = import.meta.server ? serverFetcher() : browserFetcher()
    const sessions = useSessionStore()
    const api = new ApiClient({ baseUrl: BFF_API_BASE, fetcher, onUnauthorized: () => sessions.endCustomer() })
    const auth = new HttpAuthService(new BffPhoneAuthGateway(fetcher), api, () => new Date())
    return { provide: { auth, api } }
  },
})

function browserFetcher(): typeof fetch {
  return (input, init) => fetch(input, init)
}

function serverFetcher(): typeof fetch {
  const event = useRequestEvent()
  if (event === undefined) return browserFetcher()
  return createServerFetcher({
    localFetch: (input, init) => event.fetch(input, init),
    forwarded: useRequestHeaders(['cookie', 'x-forwarded-for']),
    onSetCookie: (cookie) => appendResponseHeader(event, 'set-cookie', cookie),
  })
}
