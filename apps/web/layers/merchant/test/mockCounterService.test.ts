import {  } from 'vitest'
import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import type { MerchantSession } from '#shared/schemas/session'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'
import { describeCounterServiceContract } from './counterService.contract'

describeCounterServiceContract('mock', () => {
  const { backend } = makeBackend()
  return {
    counter: createMockMerchantServices(backend, staticSession(barbershopSession)).counter,
    signedOut: createMockMerchantServices(backend, staticSession<MerchantSession>(null)).counter,
  }
})
