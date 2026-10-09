import { describe, expect, it, vi } from 'vitest'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ShopStatus } from '#shared/schemas/shop'
import {
  type CreatedClub,
  type PosterData,
  ClubSetupRepository,
} from './club-setup.repository'
import { ClubSetupService } from './club-setup.service'

const sampleDraft: ClubSetupDraft = {
  shop: {
    name: 'Padaria Modelo',
    category: 'bakery',
    neighborhood: 'Centro',
    addressLine: 'Rua Principal, 100',
  },
  program: {
    reward: { title: 'Pão de queijo' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 2 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: false, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 4 },
  },
}

class InMemoryClubSetupRepository extends ClubSetupRepository {
  shop: { id: string; status: ShopStatus; name: string } | null = null
  poster: PosterData | null = null

  async findShopByOwner(ownerUserId: string): Promise<{ id: string; status: ShopStatus } | null> {
    return this.shop ? { id: this.shop.id, status: this.shop.status } : null
  }

  async createClub(ownerUserId: string, draft: ClubSetupDraft, checkInCode: string): Promise<CreatedClub> {
    this.shop = { id: '018f98a2-7b2a-7182-9f33-6d004bbbb999', status: 'pending', name: draft.shop.name }
    this.poster = {
      shopName: draft.shop.name,
      status: 'pending',
      checkInCode,
      rewardTitle: draft.program.reward.title,
      unit: 'stamp',
      target: 10,
    }
    return { shopId: this.shop.id, shopName: this.shop.name, shopStatus: 'pending' }
  }

  async getPoster(ownerUserId: string): Promise<PosterData | null> {
    return this.poster
  }

  async getStatus(ownerUserId: string): Promise<ShopStatus | null> {
    return this.shop?.status ?? null
  }

  async approveShop(ownerUserId: string): Promise<ShopStatus | null> {
    if (!this.shop) return null
    this.shop.status = 'approved'
    if (this.poster) this.poster = { ...this.poster, status: 'approved' }
    return 'approved'
  }
}

describe('ClubSetupService', () => {
  it('creates club successfully when user has no shop', async () => {
    const repo = new InMemoryClubSetupRepository()
    const service = new ClubSetupService(repo)

    const result = await service.createClub(TEST_USER.id, sampleDraft)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        role: 'merchant',
        merchantId: TEST_USER.id,
        shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb999',
        shopName: 'Padaria Modelo',
        shopStatus: 'pending',
      })
    }
  })

  it('rejects with invalidClubSetup when user already owns a shop', async () => {
    const repo = new InMemoryClubSetupRepository()
    repo.shop = { id: 'shop-1', status: 'approved', name: 'Existente' }
    const service = new ClubSetupService(repo)

    const result = await service.createClub(TEST_USER.id, sampleDraft)
    expect(result).toEqual({ ok: false, error: { code: 'invalidClubSetup' } })
  })

  it('retrieves poster data for the shop', async () => {
    const repo = new InMemoryClubSetupRepository()
    const service = new ClubSetupService(repo)
    await service.createClub(TEST_USER.id, sampleDraft)

    const poster = await service.getPoster(TEST_USER.id)
    expect(poster.ok).toBe(true)
    if (poster.ok) {
      expect(poster.value).toMatchObject({
        shopName: 'Padaria Modelo',
        status: 'pending',
        rewardTitle: 'Pão de queijo',
        unit: 'stamp',
        target: 10,
      })
      expect(poster.value.checkInCode).toHaveLength(6)
    }
  })

  it('returns shop status and allows test approval outside production', async () => {
    const repo = new InMemoryClubSetupRepository()
    const service = new ClubSetupService(repo)
    await service.createClub(TEST_USER.id, sampleDraft)

    const statusBefore = await service.getStatus(TEST_USER.id)
    expect(statusBefore).toEqual({ ok: true, value: 'pending' })

    vi.stubEnv('ENABLE_TEST_APPROVE', '1')
    const approved = await service.testApprove(TEST_USER.id)
    vi.unstubAllEnvs()
    expect(approved).toEqual({ ok: true, value: 'approved' })

    const statusAfter = await service.getStatus(TEST_USER.id)
    expect(statusAfter).toEqual({ ok: true, value: 'approved' })
  })

  it('refuses test approval unless ENABLE_TEST_APPROVE is on', async () => {
    const repo = new InMemoryClubSetupRepository()
    const service = new ClubSetupService(repo)
    await service.createClub(TEST_USER.id, sampleDraft)

    const refused = await service.testApprove(TEST_USER.id)
    expect(refused).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(await service.getStatus(TEST_USER.id)).toEqual({ ok: true, value: 'pending' })
  })
})
