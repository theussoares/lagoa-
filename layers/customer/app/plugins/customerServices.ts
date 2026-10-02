import { useSessionStore } from '#layers/core/app/stores/session'
import { createMockCustomerServices } from '../services/mock/createMockCustomerServices'

export default defineNuxtPlugin({
  name: 'lagoa:customer-services',
  dependsOn: ['lagoa:backend'],
  setup(nuxtApp) {
    const sessions = useSessionStore()
    const customerServices = createMockCustomerServices(nuxtApp.$mockBackend, { current: () => sessions.customer })
    return { provide: { customerServices } }
  },
})
