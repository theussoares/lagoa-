import { useSessionStore } from '#layers/core/app/stores/session'
import type { MerchantServices } from '../services/MerchantServices'
import { createHttpMerchantServices } from '../services/http/createHttpMerchantServices'
import { createMockMerchantServices } from '../services/mock/createMockMerchantServices'

export default defineNuxtPlugin({
  name: 'lagoa:merchant-services',
  dependsOn: ['lagoa:backend'],
  setup(nuxtApp) {
    const sessions = useSessionStore()
    const merchantServices: MerchantServices =
      nuxtApp.$api === null
        ? createMockMerchantServices(nuxtApp.$mockBackend, { current: () => sessions.merchant })
        : createHttpMerchantServices(nuxtApp.$api)
    return { provide: { merchantServices } }
  },
})

