import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ok, type Result } from '#shared/types/result'
import { JWKS } from '../../auth/jwks'
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard'
import { SurfaceRoleGuard } from '../../auth/surface-role.guard'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { AdminGuard } from '../access/admin.guard'
import { AdminUsersReader } from '../access/admin-users.reader'
import { AdminHitsController } from './hits.controller'
import { type AdminHitItemRecord, AdminHitsRepository, type HitItemDecision, type HitItemSnapshot, type ReviewError } from './hits.repository'
import { AdminHitsService } from './hits.service'

const ISSUER = 'https://project.supabase.co/auth/v1'
const ADMIN = '0190a000-0000-7000-8000-00000000a001'
const CUSTOMER = '0190a000-0000-7000-8000-00000000c001'
const ITEM_ID = '0190a000-0000-7000-8000-00000000d001'
const NO_CONTACT = { ctaKind: null, whatsapp: null, whatsappMessage: null, ctaUrl: null, ctaLabel: null }

const RECORD: AdminHitItemRecord = {
  id: ITEM_ID,
  version: 1,
  title: 'Bolo',
  description: null,
  priceCents: 1990,
  endsAt: null,
  status: 'approved',
  rejectionReason: null,
  photoPath: 'hits/a.jpg',
  createdAt: new Date('2026-05-01T12:00:00Z'),
  approvedAt: null,
  itemContact: NO_CONTACT,
  shop: { id: '0190a000-0000-7000-8000-00000000b001', name: 'Padaria', status: 'approved', contact: NO_CONTACT },
}

class FakeAdminUsersReader extends AdminUsersReader {
  async isActiveAdmin(userId: string): Promise<boolean> {
    return userId === ADMIN
  }
}

class FakeRepository extends AdminHitsRepository {
  reviewed: HitItemSnapshot[] = []
  current: HitItemSnapshot = { status: 'pending', version: 1, photoPath: 'hits/a.jpg' }
  list = () => Promise.resolve([RECORD])
  review = (_id: string, _adminId: string, decide: (current: HitItemSnapshot) => Result<HitItemDecision, ReviewError>): Promise<Result<AdminHitItemRecord, ReviewError>> => {
    this.reviewed.push(this.current)
    const decision = decide(this.current)
    return Promise.resolve(decision.ok ? ok(RECORD) : decision)
  }
}

describe('admin hits (HTTP)', () => {
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
      controllers: [AdminHitsController],
      providers: [
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: JWKS, useValue: createLocalJWKSet({ keys: [publicJwk] }) },
        AdminHitsService,
        { provide: AdminHitsRepository, useValue: repository },
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
    await as('get', '/v1/admin/hits', jwt).expect(403)
    await as('post', `/v1/admin/hits/${ITEM_ID}/review`, jwt).send({ action: 'reject', expectedVersion: 1, reason: 'x' }).expect(403)
  })

  it('lists the queue with the effective button and no next page', async () => {
    const res = await as('get', '/v1/admin/hits?status=pending', await adminToken()).expect(200)
    expect(res.body).toMatchObject({ items: [{ id: ITEM_ID, contact: null, contactSource: 'shop', shop: { name: 'Padaria' } }], nextCursor: null })
  })

  it.each(['status=bogus', 'cursor=nope', 'extra=1'])('rejects the list query %s', async (query) => {
    await as('get', `/v1/admin/hits?${query}`, await adminToken()).expect(400)
  })

  it.each([
    ['reject without a reason', { action: 'reject', expectedVersion: 1 }],
    ['reject with a blank reason', { action: 'reject', expectedVersion: 1, reason: '  ' }],
    ['takeDown without a reason', { action: 'takeDown' }],
    ['approve without expectedVersion', { action: 'approve' }],
    ['an unknown action', { action: 'delete' }],
  ])('rejects %s with 400', async (_name, body) => {
    repository.reviewed = []
    await as('post', `/v1/admin/hits/${ITEM_ID}/review`, await adminToken()).send(body).expect(400)
    expect(repository.reviewed).toEqual([])
  })

  it('answers 400 for a bad id', async () => {
    await as('post', '/v1/admin/hits/nope/review', await adminToken()).send({ action: 'reject', expectedVersion: 1, reason: 'x' }).expect(400)
  })

  it('answers 409 conflict for a stale approval', async () => {
    repository.current = { status: 'pending', version: 2, photoPath: 'hits/a.jpg' }
    const res = await as('post', `/v1/admin/hits/${ITEM_ID}/review`, await adminToken()).send({ action: 'approve', expectedVersion: 1 }).expect(409)
    expect(res.body).toEqual({ code: 'conflict' })
  })

  it('answers the reviewed item', async () => {
    repository.current = { status: 'pending', version: 1, photoPath: 'hits/a.jpg' }
    const res = await as('post', `/v1/admin/hits/${ITEM_ID}/review`, await adminToken()).send({ action: 'approve', expectedVersion: 1 }).expect(200)
    expect(res.body).toMatchObject({ id: ITEM_ID })
  })
})
