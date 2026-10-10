import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { err, ok } from '#shared/types/result'
import { CustomerSessionSchema, MerchantSessionSchema } from '#shared/schemas/session'
import { useMerchantSession } from '../app/composables/useMerchantSession'
import { useSessionStore } from '#layers/core/app/stores/session'
import { useMerchantSessionStore } from '../app/stores/merchantSession'

const SESSION = MerchantSessionSchema.parse({
  role: 'merchant',
  merchantId: '0190a000-0000-7000-8000-000000000001',
  shopId: '0190a000-0000-7000-8000-000000000002',
  shopName: 'Barbearia Central',
  shopStatus: 'approved',
  termsAccepted: true,
})

const { currentSession, signOut } = vi.hoisted(() => ({ currentSession: vi.fn(), signOut: vi.fn() }))
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
    signOut.mockResolvedValueOnce(ok(true))
    useMerchantSessionStore().startMerchant(SESSION)
    await useMerchantSession().signOut()
    expect(signOut).toHaveBeenCalledOnce()
    expect(useMerchantSessionStore().merchant).toBeNull()
  })

  it('keeps the session when the server does not confirm the sign out (the cookie would still be valid)', async () => {
    signOut.mockResolvedValueOnce(err({ code: 'network' }))
    useMerchantSessionStore().startMerchant(SESSION)
    await useMerchantSession().signOut()
    expect(useMerchantSessionStore().merchant).toEqual(SESSION)
  })

  it('expire forgets the session locally without calling the server', async () => {
    signOut.mockClear()
    useMerchantSessionStore().startMerchant(SESSION)
    await useMerchantSession().expire()
    expect(signOut).not.toHaveBeenCalled()
    expect(useMerchantSessionStore().merchant).toBeNull()
  })

  it('makes the customer side ask the server again, because the cookie may now belong to another account', async () => {
    const customer = useSessionStore()
    customer.startCustomer(CustomerSessionSchema.parse({ role: 'customer', customerId: '0190a000-0000-7000-8000-0000000000aa', isNewCustomer: false }))
    useMerchantSession().start(SESSION)
    expect(customer.customer).toBeNull()
    expect(customer.checked).toBe(false)
  })
})
