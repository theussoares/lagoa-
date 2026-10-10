import { buildExampleSeed, MOCK_LOGIN_CODE, MockBackend, webStorageMockStore } from '../mock'

/** Mock do painel do lojista (`merchantBackend = mock`): vive no navegador, nunca no SSR. Com `http` fica parado: só carrega e semeia o estado na primeira chamada. */
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
    return { provide: { mockBackend } }
  },
})
