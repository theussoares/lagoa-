import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { JWKS } from '../../auth/jwks'
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard'
import { SurfaceRoleGuard } from '../../auth/surface-role.guard'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { PiiService } from '../../common/pii.service'
import { ENV } from '../../config/config.module'
import type { ShopStatusResult } from '../../database/shop-status'
import { AdminGuard } from '../access/admin.guard'
import { AdminUsersReader } from '../access/admin-users.reader'
import { type AdminShopDetailRecord, type AdminShopRecord, AdminShopsRepository } from './shops.repository'
import type { ShopActionPlan } from './shops.rules'
import { AdminShopsController } from './shops.controller'
import { AdminShopsService } from './shops.service'

const ISSUER = 'https://project.supabase.co/auth/v1'
const ADMIN = '0190a000-0000-7000-8000-00000000a001'
const CUSTOMER = '0190a000-0000-7000-8000-00000000c001'
const SHOP_ID = '0190a000-0000-7000-8000-00000000b001'
const PHONE = '67991230374'
const CREATED = new Date('2026-05-01T12:00:00Z')

const pii = new PiiService({ PII_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), PII_HASH_PEPPER: 'pepper' })

const SHOP: AdminShopRecord = { id: SHOP_ID, name: 'Padaria', category: 'bakery', neighborhood: 'Centro', status: 'pending', plan: 'founder', createdAt: CREATED }
const DETAIL: AdminShopDetailRecord = {
  ...SHOP,
  addressLine: 'Rua A, 1',
  program: null,
  owner: { phoneEncrypted: pii.encrypt(PHONE), emailEncrypted: null },
  customers: 0,
  visitsLast30Days: 0,
  history: [],
}

class FakeAdminUsersReader extends AdminUsersReader {
  async isActiveAdmin(userId: string): Promise<boolean> {
    return userId === ADMIN
  }
}

class FakeRepository extends AdminShopsRepository {
  outcome: ShopStatusResult = { ok: true, from: 'pending', to: 'approved', plan: 'founder' }
  applied: ShopActionPlan[] = []
  list = () => Promise.resolve([SHOP])
  findDetail = (id: string) => Promise.resolve(id === SHOP_ID ? DETAIL : null)
  applyAction = (_shopId: string, _adminId: string, action: ShopActionPlan) => {
    this.applied.push(action)
    return Promise.resolve(this.outcome)
  }
}

describe('admin shops (HTTP)', () => {
  let app: INestApplication
  let privateKey: CryptoKey
  const repository = new FakeRepository()

  const token = (subject: string, claims: Record<string, unknown> = {}): Promise<string> =>
    new SignJWT(claims).setProtectedHeader({ alg: 'ES256', kid: 'test' }).setIssuer(ISSUER).setAudience('authenticated').setSubject(subject).setExpirationTime('5m').sign(privateKey)
  const adminToken = (): Promise<string> => token(ADMIN, { app_metadata: { role: 'admin' }, aal: 'aal2' })
  const as = (method: 'get' | 'post', path: string, jwt: string) => request(app.getHttpServer())[method](path).set('authorization', `Bearer ${jwt}`)

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256')
    privateKey = pair.privateKey
    const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'ES256' }
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 1_000 }])],
      controllers: [AdminShopsController],
      providers: [
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: JWKS, useValue: createLocalJWKSet({ keys: [publicJwk] }) },
        AdminShopsService,
        { provide: PiiService, useValue: pii },
        { provide: AdminShopsRepository, useValue: repository },
        AdminGuard,
        { provide: AdminUsersReader, useValue: new FakeAdminUsersReader() },
        { provide: APP_GUARD, useClass: SupabaseAuthGuard },
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: APP_GUARD, useClass: SurfaceRoleGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    await app.init()
  })

  afterAll(async () => app.close())

  it('refuses a customer on every route', async () => {
    const jwt = await token(CUSTOMER)
    await as('get', '/v1/admin/shops', jwt).expect(403)
    await as('get', `/v1/admin/shops/${SHOP_ID}`, jwt).expect(403)
    await as('post', `/v1/admin/shops/${SHOP_ID}/actions`, jwt).send({ action: 'approve' }).expect(403)
  })

  it('lists shops without any owner contact', async () => {
    const res = await as('get', '/v1/admin/shops?status=pending&q=pad', await adminToken()).expect(200)
    expect(res.body).toEqual({ shops: [{ ...SHOP, createdAt: CREATED.toISOString() }], nextCursor: null })
    expect(JSON.stringify(res.body)).not.toContain(PHONE)
  })

  it.each(['status=bogus', 'cursor=nope', 'q=', 'extra=1'])('rejects the list query %s', async (query) => {
    await as('get', `/v1/admin/shops?${query}`, await adminToken()).expect(400)
  })

  it('shows the owner phone only in the detail', async () => {
    const res = await as('get', `/v1/admin/shops/${SHOP_ID}`, await adminToken()).expect(200)
    expect(res.body.owner).toEqual({ phone: PHONE, email: null })
  })

  it('answers 404 for an unknown shop and 400 for a bad id', async () => {
    const jwt = await adminToken()
    const missing = await as('get', '/v1/admin/shops/0190a000-0000-7000-8000-00000000b999', jwt).expect(404)
    expect(missing.body).toEqual({ code: 'notFound', entity: 'shop' })
    await as('get', '/v1/admin/shops/not-a-uuid', jwt).expect(400)
  })

  it.each([
    ['suspend with no reason', { action: 'suspend' }],
    ['suspend with a blank reason', { action: 'suspend', reason: '   ' }],
    ['approve with extra fields', { action: 'approve', plan: 'founderPro' }],
    ['changePlan with an unknown plan', { action: 'changePlan', plan: 'gold' }],
    ['an unknown action', { action: 'delete' }],
  ])('rejects %s with 400', async (_name, body) => {
    repository.applied = []
    await as('post', `/v1/admin/shops/${SHOP_ID}/actions`, await adminToken()).send(body).expect(400)
    expect(repository.applied).toEqual([])
  })

  it('runs the action and answers the fresh detail', async () => {
    repository.outcome = { ok: true, from: 'pending', to: 'approved', plan: 'founder' }
    const res = await as('post', `/v1/admin/shops/${SHOP_ID}/actions`, await adminToken()).send({ action: 'approve' }).expect(200)
    expect(res.body).toMatchObject({ id: SHOP_ID })
  })

  it('answers 409 when the action does not fit the shop', async () => {
    repository.outcome = { ok: false, reason: 'invalidTransition' }
    const res = await as('post', `/v1/admin/shops/${SHOP_ID}/actions`, await adminToken()).send({ action: 'approve' }).expect(409)
    expect(res.body).toEqual({ code: 'invalidTransition' })
  })
})
