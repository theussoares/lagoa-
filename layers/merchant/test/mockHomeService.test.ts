import { describe, expect, it } from 'vitest'
import { WEEK_SUMMARY_DAYS } from '#shared/constants/domain'
import type { MerchantSession } from '#shared/schemas/session'
import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'

describe('mock MerchantHomeService', () => {
  it('summarizes the last days of the shop with counts only', async () => {
    const { backend } = makeBackend()
    const services = createMockMerchantServices(backend, staticSession(barbershopSession))
    const result = await services.home.getWeekSummary()
    if (!result.ok) throw new Error(result.error.code)
    expect(result.value.days).toHaveLength(WEEK_SUMMARY_DAYS)
    // Seed: Maria duas vezes nas últimas horas, Pedro novo há 2 h.
    expect(result.value).toMatchObject({ visits: 3, customers: 2, newCustomers: 1, redemptions: 0 })
    expect(JSON.stringify(result.value)).not.toMatch(/6790000|cus_/)
  })

  it('refuses without a merchant session', async () => {
    const { backend } = makeBackend()
    const services = createMockMerchantServices(backend, staticSession<MerchantSession>(null))
    expect(await services.home.getWeekSummary()).toEqual({ ok: false, error: { code: 'unauthorized' } })
  })
})
