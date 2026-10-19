import { describe, expect, it } from 'vitest'
import { PiiService } from '../../common/pii.service'
import type { ShopStatusResult } from '../../database/shop-status'
import {
  type AdminShopDetailRecord,
  type AdminShopListFilter,
  type AdminShopRecord,
  AdminShopsRepository,
} from './shops.repository'
import type { ShopActionPlan } from './shops.rules'
import { AdminShopsService } from './shops.service'

const pii = new PiiService({ PII_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), PII_HASH_PEPPER: 'pepper' })
const ADMIN = { adminId: '0190a000-0000-7000-8000-00000000a001' }
const SHOP_ID = '0190a000-0000-7000-8000-00000000b001'
const CREATED = new Date('2026-05-01T12:00:00Z')

const record = (id: string, overrides: Partial<AdminShopRecord> = {}): AdminShopRecord => ({
  id, name: 'Padaria', category: 'bakery', neighborhood: 'Centro', status: 'approved', plan: 'founder', createdAt: CREATED, ...overrides,
})

const detailRecord = (overrides: Partial<AdminShopDetailRecord> = {}): AdminShopDetailRecord => ({
  ...record(SHOP_ID),
  addressLine: 'Rua A, 1',
  program: { rewardTitle: 'Café', mode: 'stamps', target: 10 },
  owner: { phoneEncrypted: pii.encrypt('67991230374'), emailEncrypted: pii.encryptEmail('dona@example.com') },
  customers: 3,
  visitsLast30Days: 7,
  history: [],
  ...overrides,
})

class FakeRepository extends AdminShopsRepository {
  filters: AdminShopListFilter[] = []
  applied: Array<{ adminId: string; action: ShopActionPlan }> = []
  constructor(private readonly rows: readonly AdminShopRecord[], private readonly detail: AdminShopDetailRecord | null, private readonly outcome: ShopStatusResult = { ok: true, from: 'pending', to: 'approved', plan: 'founder' }) {
    super()
  }
  list = (filter: AdminShopListFilter) => {
    this.filters.push(filter)
    return Promise.resolve(this.rows)
  }
  findDetail = () => Promise.resolve(this.detail)
  applyAction = (_shopId: string, adminId: string, action: ShopActionPlan) => {
    this.applied.push({ adminId, action })
    return Promise.resolve(this.outcome)
  }
}

describe('AdminShopsService', () => {
  it('lists one page and exposes no owner contact', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => record(`0190a000-0000-7000-8000-0000000b${String(index).padStart(4, '0')}`))
    const repository = new FakeRepository(rows, null)
    const result = await new AdminShopsService(repository, pii).list({ q: 'pad' })
    expect(repository.filters[0]).toMatchObject({ name: 'pad', status: null, after: null, limit: 51 })
    expect(result.shops).toHaveLength(50)
    expect(result.nextCursor).toBe(`1:${rows[49]?.id}`)
    expect(JSON.stringify(result)).not.toContain('67991230374')
  })

  it('decrypts the owner in the detail and shows the history actor', async () => {
    const result = await new AdminShopsService(new FakeRepository([], detailRecord()), pii).detail(SHOP_ID)
    expect(result).toMatchObject({ ok: true, value: { owner: { phone: '67991230374', email: 'dona@example.com' }, stats: { customers: 3, visitsLast30Days: 7 } } })
  })

  it('has a null owner for an erased account and a null email for a phone-only owner', async () => {
    const erased = await new AdminShopsService(new FakeRepository([], detailRecord({ owner: null })), pii).detail(SHOP_ID)
    expect(erased).toMatchObject({ ok: true, value: { owner: null } })
    const phoneOnly = await new AdminShopsService(new FakeRepository([], detailRecord({ owner: { phoneEncrypted: pii.encrypt('67991230374'), emailEncrypted: null } })), pii).detail(SHOP_ID)
    expect(phoneOnly).toMatchObject({ ok: true, value: { owner: { email: null } } })
  })

  it('answers notFound for a missing shop', async () => {
    expect(await new AdminShopsService(new FakeRepository([], null), pii).detail(SHOP_ID)).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  })

  it('applies the action as the admin and returns the fresh detail', async () => {
    const repository = new FakeRepository([], detailRecord())
    const result = await new AdminShopsService(repository, pii).act(ADMIN, SHOP_ID, { action: 'approve' })
    expect(result.ok).toBe(true)
    expect(repository.applied).toEqual([{ adminId: ADMIN.adminId, action: { status: 'approved', allowedFrom: ['pending'] } }])
  })

  it.each([
    ['shopNotFound', { code: 'notFound', entity: 'shop' }],
    ['nothingToChange', { code: 'invalidTransition' }],
    ['invalidTransition', { code: 'invalidTransition' }],
  ] as const)('maps %s', async (reason, error) => {
    const repository = new FakeRepository([], detailRecord(), { ok: false, reason })
    expect(await new AdminShopsService(repository, pii).act(ADMIN, SHOP_ID, { action: 'approve' })).toEqual({ ok: false, error })
  })
})
