import { describe, expect, it } from 'vitest'
import { LoyaltyCardIdSchema, RedemptionIdSchema, ShopIdSchema, VisitIdSchema } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { CounterEntry } from '#shared/schemas/visit'
import { err, ok } from '#shared/types/result'
import {
  CounterRepository,
  type ActiveRedemptionPreview,
  type ResolvedCustomer,
  type SettleRedemptionError,
  type ShopWithProgram,
} from './counter.repository'
import { CounterRedemptionsService } from './counter-redemptions.service'

class FakeClock {
  current = new Date('2026-10-06T12:00:00.000Z')
  now(): Date {
    return this.current
  }
}

class FakeCounterRepository extends CounterRepository {
  shop: ShopWithProgram | null = {
    shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb111',
    shopName: 'Café Teste',
    shopStatus: 'approved',
    programId: '018f98a2-7b2a-7182-9f33-6d004bbbb444',
    rewardTitle: 'Café Grátis',
    mode: 'stamps',
    unit: 'stamp',
    earnPer: 'visit',
    earnUnits: 1,
    target: 10,
    bonusRules: {
      welcomeBonus: { enabled: false, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: false, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationKind: 'never',
    expirationMonths: null,
    checkInCooldownHours: 24,
  }

  activeRedemption: ActiveRedemptionPreview | null = {
    redemptionId: '018f98a2-7b2a-7182-9f33-6d004bbbb555',
    rewardTitle: 'Café Grátis',
    maskedPhone: '(67) 9••••-4567',
    expiresAt: new Date('2026-10-06T12:10:00.000Z'),
  }

  lookupError: 'redemptionInvalid' | 'redemptionExpired' | null = null
  settleError: SettleRedemptionError['code'] | null = null

  async findShopAndProgramByOwner(): Promise<ShopWithProgram | null> {
    return this.shop
  }

  async resolveOrCreateCustomer(): Promise<ResolvedCustomer> {
    throw new Error('Not implemented')
  }

  async recordVisit(): Promise<any> {
    throw new Error('Not implemented')
  }

  async listTodayEntries(): Promise<CounterEntry[]> {
    return []
  }

  async findActiveRedemption(
    _shopId: string,
    _rawCode: string,
    _now: Date,
  ): Promise<any> {
    if (this.lookupError) return err({ code: this.lookupError })
    if (!this.activeRedemption) return err({ code: 'redemptionInvalid' })
    return ok(this.activeRedemption)
  }

  async settleRedemption(
    shop: ShopWithProgram,
    redemptionId: string,
    _merchantUserId: string,
    now: Date,
  ): Promise<any> {
    if (this.settleError) return err({ code: this.settleError })
    const entry: CounterEntry = {
      id: VisitIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb666'),
      shopId: ShopIdSchema.parse(shop.shopId),
      maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-4567'),
      kind: 'redemption',
      unit: shop.unit,
      units: 0,
      amountCents: null,
      rewardTitle: shop.rewardTitle,
      isNewCustomer: false,
      createdAt: now.toISOString(),
    }
    return ok(entry)
  }
}

describe('CounterRedemptionsService', () => {
  it('returns notFound when owner has no shop', async () => {
    const repo = new FakeCounterRepository()
    repo.shop = null
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.validateRedemption('owner-1', 'ACDEFG')
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'merchant' } })
  })

  it('rejects validateRedemption when shop is pending approval', async () => {
    const repo = new FakeCounterRepository()
    repo.shop = { ...repo.shop!, shopStatus: 'pending' }
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.validateRedemption('owner-1', 'ACDEFG')
    expect(result).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
  })

  it('returns redemptionInvalid when lookup returns invalid', async () => {
    const repo = new FakeCounterRepository()
    repo.lookupError = 'redemptionInvalid'
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.validateRedemption('owner-1', 'XXXXXX')
    expect(result).toEqual({ ok: false, error: { code: 'redemptionInvalid' } })
  })

  it('returns redemptionExpired when code is expired', async () => {
    const repo = new FakeCounterRepository()
    repo.lookupError = 'redemptionExpired'
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.validateRedemption('owner-1', 'ACDEFG')
    expect(result).toEqual({ ok: false, error: { code: 'redemptionExpired' } })
  })

  it('validates redemption successfully and returns preview', async () => {
    const repo = new FakeCounterRepository()
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.validateRedemption('owner-1', 'ACDEFG')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error()
    expect(result.value).toEqual({
      redemptionId: '018f98a2-7b2a-7182-9f33-6d004bbbb555',
      rewardTitle: 'Café Grátis',
      maskedPhone: '(67) 9••••-4567',
      expiresAt: '2026-10-06T12:10:00.000Z',
    })
  })

  it('confirms redemption and returns CounterEntry', async () => {
    const repo = new FakeCounterRepository()
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.confirmRedemption('owner-1', '018f98a2-7b2a-7182-9f33-6d004bbbb555')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error()
    expect(result.value.kind).toBe('redemption')
    expect(result.value.units).toBe(0)
    expect(result.value.maskedPhone).toBe('(67) 9••••-4567')
    expect(result.value.rewardTitle).toBe('Café Grátis')
  })

  it('returns error when confirmRedemption fails', async () => {
    const repo = new FakeCounterRepository()
    repo.settleError = 'redemptionAlreadyUsed'
    const clock = new FakeClock()
    const service = new CounterRedemptionsService(repo, clock)

    const result = await service.confirmRedemption('owner-1', '018f98a2-7b2a-7182-9f33-6d004bbbb555')
    expect(result).toEqual({ ok: false, error: { code: 'redemptionAlreadyUsed' } })
  })
})
