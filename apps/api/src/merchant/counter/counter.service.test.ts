import { describe, expect, it } from 'vitest'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import type { CounterEntry } from '#shared/schemas/visit'
import {
  CounterRepository,
  type ShopWithProgram,
} from './counter.repository'
import { CounterService } from './counter.service'

class FakeCounterRepository extends CounterRepository {
  shop: ShopWithProgram | null = null
  entries: CounterEntry[] = []

  async findShopAndProgramByOwner(_ownerUserId: string): Promise<ShopWithProgram | null> {
    return this.shop
  }

  async listTodayEntries(_shopId: string, _startOfDay: Date): Promise<CounterEntry[]> {
    return this.entries
  }

  async findRedemption(): Promise<any> {
    throw new Error('Not used in counter.service')
  }

  async settleRedemption(): Promise<any> {
    throw new Error('Not used in counter.service')
  }
}

describe('CounterService', () => {
  const repo = new FakeCounterRepository()
  const clock = { now: () => new Date('2026-10-07T12:00:00Z') }
  const service = new CounterService(repo, clock as any)

  it('returns notFound when user has no shop', async () => {
    repo.shop = null
    const result = await service.listTodayEntries(TEST_USER.id)
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'merchant' } })
  })

  it('returns today entries for existing shop', async () => {
    repo.shop = {
      shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb001',
      shopName: 'Café do Lago',
      shopStatus: 'approved',
      programId: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
      rewardTitle: 'Café grátis',
      mode: 'stamps',
      unit: 'stamp',
      earnPer: 'visit',
      earnUnits: 1,
      target: 10,
      bonusRules: {
        welcomeBonus: { enabled: true, units: 2 },
        birthdayMultiplier: { enabled: false, multiplier: 2 },
        referralBonus: { enabled: false, units: 1 },
        surpriseDay: { enabled: false, multiplier: 2, date: null },
      },
      expirationKind: 'never',
      expirationMonths: null,
      checkInCooldownHours: 4,
    }

    repo.entries = [
      {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb333' as any,
        shopId: repo.shop.shopId as any,
        maskedPhone: '(67) 9••••-4567' as any,
        kind: 'visit',
        unit: 'stamp',
        units: 1,
        amountCents: null,
        rewardTitle: null,
        isNewCustomer: false,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = await service.listTodayEntries(TEST_USER.id)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual(repo.entries)
    }
  })
})
