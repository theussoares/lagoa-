import type { CustomerServices } from '../services/CustomerServices'
import { createHttpCustomerServices } from '../services/http/createHttpCustomerServices'

/** Chave de idempotência do check-in: 32 hex, um por toque (o formato que a API aceita). */
const newIdempotencyKey = (): string => crypto.randomUUID().replaceAll('-', '')

export default defineNuxtPlugin({
  name: 'lagoa:customer-services',
  dependsOn: ['lagoa:backend'],
  setup(nuxtApp) {
    // O tipo explícito corta o ciclo de inferência entre os plugins (`$api` vem de outro plugin).
    const customerServices: CustomerServices = createHttpCustomerServices(nuxtApp.$api, newIdempotencyKey)
    return { provide: { customerServices } }
  },
})
