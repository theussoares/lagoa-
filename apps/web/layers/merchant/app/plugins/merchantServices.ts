import { useMerchantSessionStore } from '../stores/merchantSession'
import { createMockMerchantServices } from '../services/mock/createMockMerchantServices'

export default defineNuxtPlugin({
  name: 'lagoa:merchant-services',
  dependsOn: ['lagoa:backend'],
  setup(nuxtApp) {
    const sessions = useMerchantSessionStore()
    const merchantServices = createMockMerchantServices(nuxtApp.$mockBackend, { current: () => sessions.merchant })
    return { provide: { merchantServices } }
  },
})
