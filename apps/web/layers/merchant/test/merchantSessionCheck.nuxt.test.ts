import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { err, ok } from '#shared/types/result'
import { MerchantSessionSchema } from '#shared/schemas/session'
import { useMerchantSession } from '../app/composables/useMerchantSession'
import { useMerchantSessionStore } from '../app/stores/merchantSession'

const SESSION = MerchantSessionSchema.parse({
  role: 'merchant',
  merchantId: '0190a000-0000-7000-8000-000000000001',
  shopId: '0190a000-0000-7000-8000-000000000002',
  shopName: 'Barbearia Central',
  shopStatus: 'approved',
})

const { currentSession, signOut } = vi.hoisted(() => ({ currentSession: vi.fn(), signOut: vi.fn(async () => {}) }))
mockNuxtImport('useMerchantAuthService', () => () => ({ currentSession, signOut }))

function resetStore(): void {
  const store = useMerchantSessionStore()
  store.merchant = null
  store.checked = false
  store.withoutShop = false
}

describe('useMerchantSession().check', () => {
  beforeEach(() => {
    currentSession.mockReset()
    resetStore()
  })

  it('opens the shop the server knows and does not ask again', async () => {
    currentSession.mockResolvedValue(ok(SESSION))
    const { check } = useMerchantSession()
    expect(await check()).toEqual({ status: 'shop', session: SESSION })
    expect(await check()).toEqual({ status: 'shop', session: SESSION })
    expect(currentSession).toHaveBeenCalledOnce()
  })

  it('tells a confirmed phone without a shop apart from a signed out visitor', async () => {
    currentSession.mockResolvedValueOnce(err({ code: 'notFound', entity: 'merchant' }))
    expect(await useMerchantSession().check()).toEqual({ status: 'noShop' })
    resetStore()
    currentSession.mockResolvedValueOnce(err({ code: 'unauthorized' }))
    expect(await useMerchantSession().check()).toEqual({ status: 'signedOut' })
  })

  it('asks again on the next navigation after a network failure', async () => {
    currentSession.mockResolvedValueOnce(err({ code: 'network' })).mockResolvedValueOnce(ok(SESSION))
    const { check } = useMerchantSession()
    expect(await check()).toEqual({ status: 'signedOut' })
    expect(useMerchantSessionStore().checked).toBe(false)
    expect(await check()).toEqual({ status: 'shop', session: SESSION })
  })

  it('signs out on the server before forgetting the session', async () => {
    useMerchantSessionStore().startMerchant(SESSION)
    await useMerchantSession().signOut()
    expect(signOut).toHaveBeenCalledOnce()
    expect(useMerchantSessionStore().merchant).toBeNull()
  })
})
