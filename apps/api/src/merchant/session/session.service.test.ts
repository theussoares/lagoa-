import { describe, expect, it } from 'vitest'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { type MerchantShopRecord, SessionRepository } from './session.repository'
import { SessionService } from './session.service'

class InMemorySessionRepository extends SessionRepository {
  constructor(private readonly shop: MerchantShopRecord | null) {
    super()
  }

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

describe('Merchant SessionService', () => {
  it('returns notFound when the user does not own any shop', async () => {
    const service = new SessionService(new InMemorySessionRepository(null))
    const result = await service.current(TEST_USER.id)
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'merchant' } })
  })

  it('returns merchant session when the user owns a shop', async () => {
    const shop: MerchantShopRecord = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb001',
      ownerUserId: TEST_USER.id,
      name: 'Café do Lago',
      status: 'approved',
      merchantTermsVersion: null,
    }
    const service = new SessionService(new InMemorySessionRepository(shop))
    const result = await service.current(TEST_USER.id)
    expect(result).toEqual({
      ok: true,
      value: {
        role: 'merchant',
        merchantId: TEST_USER.id,
        shopId: shop.id,
        shopName: 'Café do Lago',
        shopStatus: 'approved',
        termsAccepted: false,
      },
    })
  })

  it('says the terms are accepted only for the current MERCHANT_TERMS_VERSION', async () => {
    const shop: MerchantShopRecord = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb001',
      ownerUserId: TEST_USER.id,
      name: 'Café do Lago',
      status: 'approved',
      merchantTermsVersion: MERCHANT_TERMS_VERSION,
    }
    const current = await new SessionService(new InMemorySessionRepository(shop)).current(TEST_USER.id)
    const outdated = await new SessionService(new InMemorySessionRepository({ ...shop, merchantTermsVersion: 'old' })).current(TEST_USER.id)
    expect(current.ok && current.value.termsAccepted).toBe(true)
    expect(outdated.ok && outdated.value.termsAccepted).toBe(false)
  })
})
