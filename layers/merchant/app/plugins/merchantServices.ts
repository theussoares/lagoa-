import { useSessionStore } from '#layers/core/app/stores/session'
import { createMockMerchantServices } from '../services/mock/createMockMerchantServices'

export default defineNuxtPlugin({
  name: 'lagoa:merchant-services',
  dependsOn: ['lagoa:backend'],
  setup(nuxtApp) {
    const sessions = useSessionStore()
    const merchantServices = createMockMerchantServices(nuxtApp.$mockBackend, { current: () => sessions.merchant })
    return { provide: { merchantServices } }
  },
})
