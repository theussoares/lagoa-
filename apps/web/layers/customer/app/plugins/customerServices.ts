import { useSessionStore } from '#layers/core/app/stores/session'
import type { CustomerServices } from '../services/CustomerServices'
import { createHttpCustomerServices } from '../services/http/createHttpCustomerServices'
import { createMockCustomerServices } from '../services/mock/createMockCustomerServices'

/** Chave de idempotência do check-in: 32 hex, um por toque (o formato que a API aceita). */
const newIdempotencyKey = (): string => crypto.randomUUID().replaceAll('-', '')

export default defineNuxtPlugin({
  name: 'lagoa:customer-services',
  dependsOn: ['lagoa:backend'],
  setup(nuxtApp) {
    const sessions = useSessionStore()
    const customerServices: CustomerServices =
      nuxtApp.$api === null
        ? createMockCustomerServices(nuxtApp.$mockBackend, { current: () => sessions.customer })
        : createHttpCustomerServices(nuxtApp.$api, newIdempotencyKey)
    return { provide: { customerServices } }
  },
})
