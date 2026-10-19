import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { err, ok, type Result } from '#shared/types/result'
import { JWKS } from '../../auth/jwks'
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard'
import { SurfaceRoleGuard } from '../../auth/surface-role.guard'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import type { PlacementError, PlacementPeriod } from '../../featured/featured.rules'
import { AdminGuard } from '../access/admin.guard'
import { AdminUsersReader } from '../access/admin-users.reader'
import { AdminFeaturedController } from './featured.controller'
import {
  type AdminPlacementRecord,
  AdminFeaturedRepository,
  type CancelPlacementError,
  type CreatePlacementError,
  type PlacementCandidate,
  type PlacementSnapshot,
  type PlacementWindow,
} from './featured.repository'
import { AdminFeaturedService } from './featured.service'

const ISSUER = 'https://project.supabase.co/auth/v1'
const ADMIN = '0190a000-0000-7000-8000-00000000a001'
const CUSTOMER = '0190a000-0000-7000-8000-00000000c001'
const SHOP = '0190a000-0000-7000-8000-00000000b001'
const PLACEMENT = '0190a000-0000-7000-8000-00000000e001'

const RECORD: AdminPlacementRecord = {
  id: PLACEMENT,
  surface: 'discoverCarousel',
  shop: { id: SHOP, name: 'Padaria' },
  hitItem: null,
  startsAt: new Date('2026-11-10T04:00:00Z'),
  endsAt: new Date('2026-11-20T04:00:00Z'),
  note: 'Venda 12',
  createdByName: 'Ana da Rede',
  createdAt: new Date('2026-10-19T12:00:00Z'),
  cancelledAt: null,
  cancelledByName: null,
}

const DRAFT = { shopId: SHOP, surface: 'discoverCarousel', hitItemId: null, startsAt: '2026-11-15T04:00:00Z', endsAt: '2026-11-16T04:00:00Z', note: null }

class FakeAdminUsersReader extends AdminUsersReader {
  async isActiveAdmin(userId: string): Promise<boolean> {
    return userId === ADMIN
  }
}

class FakeRepository extends AdminFeaturedRepository {
  snapshot: PlacementSnapshot = { shopStatus: 'approved', hitItem: null, existing: [] }
  windows: PlacementWindow[] = []
  created: { candidate: PlacementCandidate; adminId: string }[] = []
  cancelResult: Result<AdminPlacementRecord, CancelPlacementError> = ok(RECORD)
  periods: PlacementPeriod[] = []

  list = (window: PlacementWindow) => {
    this.windows.push(window)
    return Promise.resolve([RECORD])
  }
  listProShops = () => Promise.resolve([{ id: SHOP, name: 'Padaria' }])
  activePeriods = (window: PlacementWindow) => {
    this.windows.push(window)
    return Promise.resolve(this.periods)
  }
  create = (candidate: PlacementCandidate, adminId: string, decide: (snapshot: PlacementSnapshot) => Result<void, PlacementError>): Promise<Result<AdminPlacementRecord, CreatePlacementError>> => {
    this.created.push({ candidate, adminId })
    const decision = decide(this.snapshot)
    return Promise.resolve(decision.ok ? ok(RECORD) : decision)
  }
  cancel = () => Promise.resolve(this.cancelResult)
}

describe('admin featured (HTTP)', () => {
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
      controllers: [AdminFeaturedController],
      providers: [
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: JWKS, useValue: createLocalJWKSet({ keys: [publicJwk] }) },
        AdminFeaturedService,
        { provide: AdminFeaturedRepository, useValue: repository },
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

  beforeEach(() => {
    repository.snapshot = { shopStatus: 'approved', hitItem: null, existing: [] }
    repository.windows = []
    repository.created = []
    repository.periods = []
    repository.cancelResult = ok(RECORD)
  })

  it('refuses a customer and an admin without aal2 on every route', async () => {
    for (const jwt of [await token(CUSTOMER), await token(ADMIN, { app_metadata: { role: 'admin' }, aal: 'aal1' })]) {
      await as('get', '/v1/admin/featured?surface=hitsBanner&from=2026-11-01&to=2026-11-02', jwt).expect(403)
      await as('get', '/v1/admin/featured/availability?surface=hitsBanner&from=2026-11-01&to=2026-11-02', jwt).expect(403)
      await as('post', '/v1/admin/featured', jwt).send(DRAFT).expect(403)
      await as('post', `/v1/admin/featured/${PLACEMENT}/cancel`, jwt).expect(403)
    }
    expect(repository.created).toEqual([])
  })

  it('lists the placements of the local-day window and the Pro shops', async () => {
    const res = await as('get', '/v1/admin/featured?surface=discoverCarousel&from=2026-11-01&to=2026-12-01', await adminToken()).expect(200)
    expect(res.body).toEqual({
      placements: [
        {
          id: PLACEMENT,
          surface: 'discoverCarousel',
          shop: { id: SHOP, name: 'Padaria' },
          hitItem: null,
          startsAt: '2026-11-10T04:00:00.000Z',
          endsAt: '2026-11-20T04:00:00.000Z',
          note: 'Venda 12',
          createdBy: { name: 'Ana da Rede' },
          createdAt: '2026-10-19T12:00:00.000Z',
          cancelledAt: null,
          cancelledBy: null,
        },
      ],
      proShops: [{ id: SHOP, name: 'Padaria' }],
    })
    expect(repository.windows).toEqual([{ surface: 'discoverCarousel', from: new Date('2026-11-01T04:00:00Z'), to: new Date('2026-12-01T04:00:00Z') }])
  })

  it('answers the free slots of each day', async () => {
    repository.periods = [{ startsAt: new Date('2026-11-01T04:00:00Z'), endsAt: new Date('2026-11-02T04:00:00Z') }]
    const res = await as('get', '/v1/admin/featured/availability?surface=hitsBanner&from=2026-11-01&to=2026-11-03', await adminToken()).expect(200)
    expect(res.body).toEqual({ days: [{ date: '2026-11-01', freeSlots: 2 }, { date: '2026-11-02', freeSlots: 3 }] })
  })

  it.each([
    'surface=hitsBanner&from=2026-11-01&to=2027-01-31',
    'surface=hitsBanner&from=2026-11-02&to=2026-11-01',
    'surface=bogus&from=2026-11-01&to=2026-11-02',
    'surface=hitsBanner&from=2026-11-01',
    'surface=hitsBanner&from=2026-11-01&to=2026-11-02&extra=1',
  ])('rejects the range %s with 400', async (query) => {
    await as('get', `/v1/admin/featured/availability?${query}`, await adminToken()).expect(400)
    await as('get', `/v1/admin/featured?${query}`, await adminToken()).expect(400)
    expect(repository.windows).toEqual([])
  })

  it('creates a placement as the admin of the token', async () => {
    const res = await as('post', '/v1/admin/featured', await adminToken()).send(DRAFT).expect(201)
    expect(res.body).toMatchObject({ id: PLACEMENT, createdBy: { name: 'Ana da Rede' } })
    expect(repository.created).toEqual([
      {
        adminId: ADMIN,
        candidate: { shopId: SHOP, surface: 'discoverCarousel', hitItemId: null, startsAt: new Date('2026-11-15T04:00:00Z'), endsAt: new Date('2026-11-16T04:00:00Z'), note: null },
      },
    ])
  })

  it.each([
    ['a banner without an item', { ...DRAFT, surface: 'hitsBanner' }],
    ['a carousel with an item', { ...DRAFT, hitItemId: PLACEMENT }],
    ['an end before the start', { ...DRAFT, endsAt: '2026-11-15T04:00:00Z' }],
    ['an unknown field', { ...DRAFT, createdByAdminId: CUSTOMER }],
  ])('rejects %s with 400', async (_name, body) => {
    await as('post', '/v1/admin/featured', await adminToken()).send(body).expect(400)
    expect(repository.created).toEqual([])
  })

  it('answers 409 slotsFull when the period is full', async () => {
    const taken = { startsAt: new Date('2026-11-10T04:00:00Z'), endsAt: new Date('2026-11-20T04:00:00Z') }
    repository.snapshot = { shopStatus: 'approved', hitItem: null, existing: [taken, taken, taken, taken] }
    const res = await as('post', '/v1/admin/featured', await adminToken()).send(DRAFT).expect(409)
    expect(res.body).toEqual({ code: 'slotsFull' })
  })

  it('answers 422 invalidTarget for a suspended shop', async () => {
    repository.snapshot = { shopStatus: 'suspended', hitItem: null, existing: [] }
    const res = await as('post', '/v1/admin/featured', await adminToken()).send(DRAFT).expect(422)
    expect(res.body).toEqual({ code: 'invalidTarget' })
  })

  it('cancels with 200, and answers 409 for an already cancelled one and 404 for an unknown one', async () => {
    await as('post', `/v1/admin/featured/${PLACEMENT}/cancel`, await adminToken()).expect(200)
    repository.cancelResult = err({ code: 'invalidTransition' })
    await as('post', `/v1/admin/featured/${PLACEMENT}/cancel`, await adminToken()).expect(409)
    repository.cancelResult = err({ code: 'notFound', entity: 'featuredPlacement' })
    const res = await as('post', `/v1/admin/featured/${PLACEMENT}/cancel`, await adminToken()).expect(404)
    expect(res.body).toEqual({ code: 'notFound', entity: 'featuredPlacement' })
  })

  it('answers 400 for a bad id', async () => {
    await as('post', '/v1/admin/featured/nope/cancel', await adminToken()).expect(400)
  })
})
