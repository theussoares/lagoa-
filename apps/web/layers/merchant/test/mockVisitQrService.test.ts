import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { updateProgram } from '#layers/core/app/mock/handlers/merchant'
import { claimVisitQr } from '#layers/core/app/mock/handlers/visitQrClaim'
import { anaSession, barbershopSession, cafeSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import type { MerchantSession } from '#shared/schemas/session'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'
import { describeVisitQrServiceContract } from './visitQrService.contract'

describeVisitQrServiceContract('mock', () => {
  const { backend } = makeBackend()
  const servicesFor = (session: MerchantSession | null) => createMockMerchantServices(backend, staticSession(session))
  return {
    visitQr: servicesFor(barbershopSession).visitQr,
    perReal: servicesFor(cafeSession).visitQr,
    otherShop: servicesFor(cafeSession).visitQr,
    signedOut: servicesFor(null).visitQr,
    claimAsCustomer: (credential) => backend.run((ctx) => claimVisitQr(ctx, anaSession.customerId, credential)),
    changeProgram: async () => {
      await backend.run((ctx) => {
        const current = ctx.state.programs.find((program) => program.shopId === EXAMPLE_IDS.shops.barbershop)
        if (current === undefined) throw new Error('seed has no barbershop program')
        const { id: _id, shopId: _shopId, ...draft } = current
        return updateProgram(ctx, EXAMPLE_IDS.shops.barbershop, { ...draft, reward: { title: 'Barba grátis' } })
      })
    },
    closeShop: async (status) => {
      await backend.run((ctx) => {
        ctx.state.shops = ctx.state.shops.map((shop) => (shop.id === EXAMPLE_IDS.shops.barbershop ? { ...shop, status } : shop))
      })
    },
  }
})

describe('mock visit QR testing service', () => {
  it('is wired next to the real service and simulates the use of an active QR', async () => {
    const { backend } = makeBackend()
    const services = createMockMerchantServices(backend, staticSession(barbershopSession))
    const issued = await services.visitQr.issueVisitQr({})
    if (!issued.ok) throw new Error(issued.error.code)
    const simulated = await services.visitQrTesting?.simulateClaim(issued.value.id)
    expect(simulated).toMatchObject({ ok: true, value: { status: 'claimed' } })
  })
})
