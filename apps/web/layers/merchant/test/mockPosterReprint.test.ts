import { describe, expect, it } from 'vitest'
import type { MerchantSession } from '#shared/schemas/session'
import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'

describe('mock PosterReprintService', () => {
  it('is pending for a seeded shop until the new poster is printed', async () => {
    const { backend } = makeBackend()
    const { posterReprint } = createMockMerchantServices(backend, staticSession(barbershopSession))
    expect(await posterReprint.isPending()).toEqual({ ok: true, value: true })
    expect(await posterReprint.markPrinted()).toEqual({ ok: true, value: false })
    expect(await posterReprint.isPending()).toEqual({ ok: true, value: false })
  })

  it('keeps the mark idempotent', async () => {
    const { backend } = makeBackend()
    const { posterReprint } = createMockMerchantServices(backend, staticSession(barbershopSession))
    await posterReprint.markPrinted()
    expect(await posterReprint.markPrinted()).toEqual({ ok: true, value: false })
  })

  it('refuses without a merchant session', async () => {
    const { backend } = makeBackend()
    const { posterReprint } = createMockMerchantServices(backend, staticSession<MerchantSession>(null))
    const refused = { ok: false, error: { code: 'unauthorized' } }
    expect(await posterReprint.isPending()).toEqual(refused)
    expect(await posterReprint.markPrinted()).toEqual(refused)
  })
})
