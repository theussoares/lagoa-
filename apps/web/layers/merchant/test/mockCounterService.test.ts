import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import type { MerchantSession } from '#shared/schemas/session'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'
import { describeCounterServiceContract } from './counterService.contract'
import { earnVisit } from './earnVisit'

describeCounterServiceContract('mock', () => {
  const { backend } = makeBackend()
  const merchant = createMockMerchantServices(backend, staticSession(barbershopSession))
  return {
    counter: merchant.counter,
    signedOut: createMockMerchantServices(backend, staticSession<MerchantSession>(null)).counter,
    earnVisit: async () => {
      await earnVisit(backend, merchant, EXAMPLE_IDS.customers.joao)
      return '(67) 9••••-0002'
    },
  }
})
