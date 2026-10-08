import { beforeEach, describe, expect, it } from 'vitest'
import { AMOUNT_MAX_CENTS } from '#shared/constants/domain'
import type { ProgramRules } from '#shared/schemas/program'
import type { VisitQr, VisitQrCancelReason, VisitQrStatus } from '#shared/schemas/visitQr'
import { Clock } from '../../common/clock'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import type { ActiveProgramRules, InsertVisitQrParams } from './visit-qrs.repository'
import { VisitQrsRepository } from './visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs.rules'
import { VisitQrsService } from './visit-qrs.service'

class FakeClock extends Clock {
  constructor(private currentTime: Date) {
    super()
  }

  now(): Date {
    return this.currentTime
  }

  setTime(time: Date): void {
    this.currentTime = time
  }
}

class FakeSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = null

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

class FakeVisitQrsRepository extends VisitQrsRepository {
  activeProgram: ActiveProgramRules | null = null
  qrs = new Map<string, VisitQr>()
  lastCreatedParams: InsertVisitQrParams | null = null

  async findActiveProgram(_shopId: string): Promise<ActiveProgramRules | null> {
    return this.activeProgram
  }

  async createVisitQr(params: InsertVisitQrParams): Promise<string> {
    this.lastCreatedParams = params
    const id = '018f98a2-7b2a-7182-9f33-6d004bbbb099'
    const qr: VisitQr = {
      id: id as any,
      visitCode: params.visitCode as any,
      status: 'active',
      earn: params.earn,
      createdAt: params.createdAt.toISOString() as any,
      expiresAt: params.expiresAt.toISOString() as any,
      claim: null,
      refusal: null,
    }
    this.qrs.set(id, qr)
    return id
  }

  async findById(_shopId: string, id: string): Promise<VisitQr | null> {
    return this.qrs.get(id) ?? null
  }

  async cancel(_shopId: string, id: string, _reason: VisitQrCancelReason): Promise<VisitQr | null> {
    const existing = this.qrs.get(id)
    if (!existing) return null
    const updated: VisitQr = { ...existing, status: 'cancelled' }
    this.qrs.set(id, updated)
    return updated
  }
}

describe('VisitQrsService', () => {
  const clock = new FakeClock(new Date('2026-10-07T14:00:00Z'))
  const sessionRepo = new FakeSessionRepository()
  const visitQrsRepo = new FakeVisitQrsRepository()
  const rules = new VisitQrsRules()
  const service = new VisitQrsService(visitQrsRepo, sessionRepo, rules, clock)

  const ownerUserId = '018f98a2-7b2a-7182-9f33-6d004bbbb001'
  const shopId = '018f98a2-7b2a-7182-9f33-6d004bbbb002'

  const stampsRules: ProgramRules = { mode: 'stamps', target: 10 }
  const currencyRules: ProgramRules = { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 }

  beforeEach(() => {
    clock.setTime(new Date('2026-10-07T14:00:00Z'))
    sessionRepo.shop = {
      id: shopId,
      ownerUserId,
      name: 'Café do Lago',
      status: 'approved',
    }
    visitQrsRepo.activeProgram = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb003',
      rules: stampsRules,
    }
    visitQrsRepo.qrs.clear()
    visitQrsRepo.lastCreatedParams = null
  })

  describe('issueVisitQr', () => {
    it('issues an active stamp visit QR with 5-minute TTL, token and visitCode', async () => {
      const result = await service.issueVisitQr(ownerUserId, {})
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.value).toMatchObject({
        status: 'active',
        earn: { kind: 'visit' },
        claim: null,
        refusal: null,
      })
      expect(result.value.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(result.value.visitCode).toHaveLength(5)
      expect(Date.parse(result.value.expiresAt) - Date.parse(result.value.createdAt)).toBe(5 * 60_000)
    })

    it('issues a points-per-real visit QR with amount', async () => {
      visitQrsRepo.activeProgram = {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb003',
        rules: currencyRules,
      }

      const result = await service.issueVisitQr(ownerUserId, { amountCents: 3200 })
      expect(result).toMatchObject({
        ok: true,
        value: { earn: { kind: 'amount', amountCents: 3200 } },
      })
    })

    it('rejects missing amount on points-per-real with invalidAmount', async () => {
      visitQrsRepo.activeProgram = {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb003',
        rules: currencyRules,
      }

      const result = await service.issueVisitQr(ownerUserId, {})
      expect(result).toEqual({ ok: false, error: { code: 'invalidAmount' } })
    })

    it('rejects amount on stamps program with amountNotAccepted', async () => {
      const result = await service.issueVisitQr(ownerUserId, { amountCents: 5000 })
      expect(result).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
    })

    it('rejects when shop is pending approval', async () => {
      sessionRepo.shop = { ...sessionRepo.shop!, status: 'pending' }
      const result = await service.issueVisitQr(ownerUserId, {})
      expect(result).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
    })

    it('rejects when shop is suspended', async () => {
      sessionRepo.shop = { ...sessionRepo.shop!, status: 'suspended' }
      const result = await service.issueVisitQr(ownerUserId, {})
      expect(result).toEqual({ ok: false, error: { code: 'shopSuspended' } })
    })

    it('returns notFound when user has no shop', async () => {
      sessionRepo.shop = null
      const result = await service.issueVisitQr(ownerUserId, {})
      expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'merchant' } })
    })
  })

  describe('getVisitQr', () => {
    it('returns the QR with derived status when active', async () => {
      const issued = await service.issueVisitQr(ownerUserId, {})
      if (!issued.ok) throw new Error('Failed to issue')

      const retrieved = await service.getVisitQr(ownerUserId, issued.value.id)
      expect(retrieved.ok).toBe(true)
      if (!retrieved.ok) return

      expect(retrieved.value.id).toBe(issued.value.id)
      expect(retrieved.value.status).toBe('active')
      // O token nunca vaza no get
      expect((retrieved.value as any).token).toBeUndefined()
    })

    it('derives status expired when past expiresAt', async () => {
      const issued = await service.issueVisitQr(ownerUserId, {})
      if (!issued.ok) throw new Error('Failed to issue')

      // Avança o relógio em 6 minutos
      clock.setTime(new Date('2026-10-07T14:06:00Z'))

      const retrieved = await service.getVisitQr(ownerUserId, issued.value.id)
      expect(retrieved.ok).toBe(true)
      if (!retrieved.ok) return

      expect(retrieved.value.status).toBe('expired')
    })

    it('returns notFound if qr does not exist', async () => {
      const result = await service.getVisitQr(ownerUserId, '018f98a2-7b2a-7182-9f33-6d004bbbb999')
      expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'visitQr' } })
    })
  })

  describe('cancelVisitQr', () => {
    it('cancels an active QR', async () => {
      const issued = await service.issueVisitQr(ownerUserId, {})
      if (!issued.ok) throw new Error('Failed to issue')

      const cancelled = await service.cancelVisitQr(ownerUserId, issued.value.id)
      expect(cancelled.ok).toBe(true)
      if (!cancelled.ok) return

      expect(cancelled.value.status).toBe('cancelled')
    })

    it('is idempotent when already expired or cancelled', async () => {
      const issued = await service.issueVisitQr(ownerUserId, {})
      if (!issued.ok) throw new Error('Failed to issue')

      const firstCancel = await service.cancelVisitQr(ownerUserId, issued.value.id)
      expect(firstCancel.ok).toBe(true)

      const secondCancel = await service.cancelVisitQr(ownerUserId, issued.value.id)
      expect(secondCancel.ok).toBe(true)
      if (!secondCancel.ok) return
      expect(secondCancel.value.status).toBe('cancelled')
    })
  })
})
