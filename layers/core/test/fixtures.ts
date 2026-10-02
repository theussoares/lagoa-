import { buildExampleSeed, EXAMPLE_IDS, fixedClock, memoryMockStore, MockBackend, MOCK_LOGIN_CODE, sequentialIds } from '#layers/core/app/mock'
import type { RandomSource } from '#layers/core/app/mock'
import type { SessionProvider } from '#layers/core/app/services/SessionProvider'
import type { CustomerSession, MerchantSession } from '#shared/schemas/session'

/** Meio-dia em Três Lagoas (UTC−4): "hoje" não vira de dia no meio do teste. */
export const TEST_NOW = new Date('2026-10-01T16:00:00Z')

export function sequentialRandom(): RandomSource {
  let seed = 7
  return {
    int: (max) => {
      seed = (seed * 48271) % 2147483647
      return seed % max
    },
  }
}

export function makeBackend(now: Date = TEST_NOW): { backend: MockBackend; clock: ReturnType<typeof fixedClock> } {
  const clock = fixedClock(now)
  const backend = new MockBackend({
    store: memoryMockStore(),
    seed: buildExampleSeed,
    loginCode: MOCK_LOGIN_CODE,
    runtime: { clock, ids: sequentialIds(), random: sequentialRandom() },
  })
  return { backend, clock }
}

export function staticSession<S>(session: S | null): SessionProvider<S> {
  return { current: () => session }
}

export const anaSession: CustomerSession = {
  role: 'customer',
  customerId: EXAMPLE_IDS.customers.ana,
  isNewCustomer: false,
}

export const cafeSession: MerchantSession = {
  role: 'merchant',
  merchantId: EXAMPLE_IDS.merchants.cafe,
  shopId: EXAMPLE_IDS.shops.cafe,
  shopName: 'Café da Orla',
}

export const barbershopSession: MerchantSession = {
  role: 'merchant',
  merchantId: EXAMPLE_IDS.merchants.barbershop,
  shopId: EXAMPLE_IDS.shops.barbershop,
  shopName: 'Barbearia Navalha',
}
