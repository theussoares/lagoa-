import { buildExampleSeed, MOCK_LOGIN_CODE, MockBackend, webStorageMockStore } from '../mock'
import type { AuthService } from '../services/AuthService'
import { MockAuthService } from '../services/MockAuthService'

/**
 * Único ponto que escolhe a implementação dos services. Hoje só existe o mock;
 * o modo 'http' entra com o ADR do backend.
 */
export default defineNuxtPlugin({
  name: 'lagoa:backend',
  setup() {
    const config = useRuntimeConfig()
    if (config.public.apiMode !== 'mock') {
      throw createError({ statusCode: 500, statusMessage: `apiMode "${config.public.apiMode}" ainda não implementado` })
    }
    const mockBackend = new MockBackend({
      store: webStorageMockStore(window.localStorage),
      seed: buildExampleSeed,
      loginCode: MOCK_LOGIN_CODE,
      latencyMs: Number(config.public.mockLatencyMs),
    })
    const auth: AuthService = new MockAuthService(mockBackend)
    return { provide: { mockBackend, auth } }
  },
})
