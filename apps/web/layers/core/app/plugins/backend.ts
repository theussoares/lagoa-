import { useSessionStore } from '../stores/session'
import { buildExampleSeed, MOCK_LOGIN_CODE, MockBackend, webStorageMockStore } from '../mock'
import type { AuthService } from '../services/AuthService'
import { HttpAuthService } from '../services/HttpAuthService'
import { MockAuthService } from '../services/MockAuthService'
import { BffPhoneAuthGateway } from '../services/BffPhoneAuthGateway'
import { ApiClient } from '../services/http/ApiClient'
import { BFF_API_BASE } from '../services/http/bffPaths'
import type { BackendWiring } from '../types/backend'

/**
 * Único ponto que escolhe a implementação dos services. `mock`: tudo no navegador. `http`: o cliente fala com a
 * API real pelo BFF do Nuxt (`server/`): login por SMS no Supabase e token em cookie httpOnly; o painel do lojista continua no mock até a API dele existir.
 */
export default defineNuxtPlugin({
  name: 'lagoa:backend',
  setup() {
    const config = useRuntimeConfig()
    const mockBackend = new MockBackend({
      store: webStorageMockStore(window.localStorage),
      seed: buildExampleSeed,
      loginCode: MOCK_LOGIN_CODE,
      latencyMs: Number(config.public.mockLatencyMs),
    })
    const mockAuth = new MockAuthService(mockBackend)
    const wiring: BackendWiring = config.public.apiMode === 'http' ? wireHttp(mockAuth) : wireMock(mockAuth)
    return { provide: { mockBackend, auth: wiring.auth, api: wiring.api } }
  },
})

function wireMock(mockAuth: MockAuthService): BackendWiring {
  const auth: AuthService = mockAuth
  return { auth, api: null }
}

function wireHttp(mockAuth: MockAuthService): BackendWiring {
  const fetcher: typeof fetch = (input, init) => fetch(input, init)
  const sessions = useSessionStore()
  const api = new ApiClient({
    baseUrl: BFF_API_BASE,
    fetcher,
    onUnauthorized: () => {
      sessions.endCustomer()
      sessions.endMerchant()
    },
  })
  const auth: AuthService = new HttpAuthService(new BffPhoneAuthGateway(fetcher), api, mockAuth, () => new Date())
  return { auth, api }
}
