import { buildExampleSeed, MOCK_LOGIN_CODE, MockBackend, webStorageMockStore } from '../mock'
import { MockAuthService } from '../services/MockAuthService'

/** Mock só do painel do lojista (a API dele ainda não existe): vive no navegador, nunca no SSR. */
export default defineNuxtPlugin({
  name: 'lagoa:mock-backend',
  setup() {
    const config = useRuntimeConfig()
    const mockBackend = new MockBackend({
      store: webStorageMockStore(window.localStorage),
      seed: buildExampleSeed,
      loginCode: MOCK_LOGIN_CODE,
      latencyMs: Number(config.public.mockLatencyMs),
    })
    return { provide: { mockBackend, merchantAuth: new MockAuthService(mockBackend) } }
  },
})
