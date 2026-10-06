import { describe, expect, it } from 'vitest'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { createTestPii } from '../../test-support/pii'
import type { EarnInput } from '#shared/domain/programStrategies'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import {
  CounterRepository,
  type ResolvedCustomer,
  type ShopWithProgram,
} from './counter.repository'
import { CounterService } from './counter.service'
import type { ReferralSettlement, SettlementOutcome } from '../../ledger/referral-settlement'

const pii = createTestPii()

class FakeReferralSettlement implements ReferralSettlement {
  settledWith: { customerId: string; shopId: string } | null = null

  async settlePending(referredId: string, shopId: string): Promise<SettlementOutcome> {
    this.settledWith = { customerId: referredId, shopId }
    return 'rewarded'
  }
}

class FakeCounterRepository extends CounterRepository {
  shop: ShopWithProgram | null = null
  customer: ResolvedCustomer = {
    customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb222',
    birthday: null,
    isNewCustomer: false,
    phone: '67991234567',
  }
  isFirstVisit = false
  entries: CounterEntry[] = []

  async findShopAndProgramByOwner(ownerUserId: string): Promise<ShopWithProgram | null> {
    return this.shop
  }

  async resolveOrCreateCustomer(phone: string): Promise<ResolvedCustomer> {
    return { ...this.customer, phone }
  }

  async recordVisit(
    shop: ShopWithProgram,
    customer: ResolvedCustomer,
    input: EarnInput,
  ): Promise<{ visit: VisitRegistered; isFirstVisit: boolean }> {
    const visit: VisitRegistered = {
      entry: {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb333' as any,
        shopId: shop.shopId as any,
        maskedPhone: '(67) 9••••-4567' as any,
        kind: input.kind === 'amount' ? 'amount' : 'visit',
        unit: shop.unit,
        units: 1,
        amountCents: input.kind === 'amount' ? input.amountCents : null,
        rewardTitle: null,
        isNewCustomer: this.isFirstVisit,
        createdAt: new Date().toISOString(),
      },
      card: {
        cardId: '018f98a2-7b2a-7182-9f33-6d004bbbb444' as any,
        unit: shop.unit,
        balance: 1,
        target: shop.target,
        rewardReady: false,
      },
      unitsEarned: 1,
      welcomeUnits: 0,
    }
    return { visit, isFirstVisit: this.isFirstVisit }
  }

  async listTodayEntries(): Promise<CounterEntry[]> {
    return this.entries
  }
}

const operationalStampsShop: ShopWithProgram = {
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

describe('CounterService', () => {
  it('rejects invalid phone numbers', async () => {
    const repo = new FakeCounterRepository()
    const referrals = new FakeReferralSettlement()
    const service = new CounterService(repo, { now: () => new Date() }, pii, referrals)

    const result = await service.registerVisit(TEST_USER.id, '123', { kind: 'visit' })
    expect(result).toEqual({ ok: false, error: { code: 'invalidPhone' } })
  })

  it('rejects when shop is not found', async () => {
    const repo = new FakeCounterRepository()
    repo.shop = null
    const referrals = new FakeReferralSettlement()
    const service = new CounterService(repo, { now: () => new Date() }, pii, referrals)

    const result = await service.registerVisit(TEST_USER.id, '67991234567', { kind: 'visit' })
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'merchant' } })
  })

  it('rejects when shop is pending approval', async () => {
    const repo = new FakeCounterRepository()
    repo.shop = { ...operationalStampsShop, shopStatus: 'pending' }
    const referrals = new FakeReferralSettlement()
    const service = new CounterService(repo, { now: () => new Date() }, pii, referrals)

    const result = await service.registerVisit(TEST_USER.id, '67991234567', { kind: 'visit' })
    expect(result).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
  })

  it('rejects amount on stamps mode', async () => {
    const repo = new FakeCounterRepository()
    repo.shop = operationalStampsShop
    const referrals = new FakeReferralSettlement()
    const service = new CounterService(repo, { now: () => new Date() }, pii, referrals)

    const result = await service.registerVisit(TEST_USER.id, '67991234567', { kind: 'amount', amountCents: 5000 })
    expect(result).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
  })

  it('registers visit and triggers referral settlement on first visit', async () => {
    const repo = new FakeCounterRepository()
    repo.shop = operationalStampsShop
    repo.isFirstVisit = true
    const referrals = new FakeReferralSettlement()
    const service = new CounterService(repo, { now: () => new Date() }, pii, referrals)

    const result = await service.registerVisit(TEST_USER.id, '67991234567', { kind: 'visit' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.entry.kind).toBe('visit')
      expect(result.value.unitsEarned).toBe(1)
    }
    expect(referrals.settledWith).toEqual({
      customerId: repo.customer.customerId,
      shopId: operationalStampsShop.shopId,
    })
  })
})
