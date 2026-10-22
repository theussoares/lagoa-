import { Controller, Get, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { JWKS } from '../../auth/jwks'
import { Public } from '../../auth/public.decorator'
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard'
import { SurfaceRoleGuard } from '../../auth/surface-role.guard'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { WalletController } from '../../customer/wallet/wallet.controller'
import { WalletService } from '../../customer/wallet/wallet.service'
import type { MerchantShopContext } from '../../merchant/access/merchant-shop.context'
import { MerchantShopGuard } from '../../merchant/access/merchant-shop.guard'
import { MerchantShopResolver } from '../../merchant/access/merchant-shop.resolver'
import { SessionController } from '../../merchant/session/session.controller'
import { type MerchantShopRecord, SessionRepository } from '../../merchant/session/session.repository'
import { SessionService } from '../../merchant/session/session.service'
import type { AdminContext } from './admin.context'
import { AdminGuard } from './admin.guard'
import { AdminUsersReader } from './admin-users.reader'
import { AdminSurface } from './admin-surface.decorator'
import { CurrentAdmin } from './current-admin.decorator'

const ISSUER = 'https://project.supabase.co/auth/v1'
const ACTIVE_ADMIN = '0190a000-0000-7000-8000-00000000a001'
const DISABLED_ADMIN = '0190a000-0000-7000-8000-00000000a002'
const UNREGISTERED_ADMIN = '0190a000-0000-7000-8000-00000000a003'
const CUSTOMER = '0190a000-0000-7000-8000-00000000c001'

/** Só o ativo passa; o desativado e o que nunca foi convidado não têm linha ativa em `admin_users`. */
class FakeAdminUsersReader extends AdminUsersReader {
  async isActiveAdmin(userId: string): Promise<boolean> {
    return userId === ACTIVE_ADMIN
  }
}

class NoShopResolver extends MerchantShopResolver {
  async resolveForUser(): Promise<MerchantShopContext | null> {
    return null
  }
}

class NoShopSessionRepository extends SessionRepository {
  async findByOwnerUserId(): Promise<MerchantShopRecord | null> {
    return null
  }
}

/** Rota só do teste, no lugar de uma rota real de admin (as reais chegam nas próximas tarefas). */
@AdminSurface()
@Controller('admin/shops')
class TestAdminShopsController {
  @Get()
  list(@CurrentAdmin() admin: AdminContext): AdminContext {
    return admin
  }
}

/** Sob `admin/` mas sem `@AdminSurface()`: sem o AdminGuard, ninguém pode passar (nem cliente, nem admin). */
@Controller('admin/forgotten')
class TestForgottenAdminController {
  @Get()
  list(): { ok: true } {
    return { ok: true }
  }
}

/** `@Public()` por engano numa rota da rede: sem usuário, o AdminGuard recusa em vez de quebrar. */
@AdminSurface()
@Controller('admin/public-by-mistake')
class TestPublicAdminController {
  @Public()
  @Get()
  list(): { ok: true } {
    return { ok: true }
  }
}

describe('admin role separation (global guard chain)', () => {
  let app: INestApplication
  let privateKey: CryptoKey

  async function tokenFor(subject: string, claims: Record<string, unknown> = {}): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setSubject(subject)
      .setExpirationTime('5m')
      .sign(privateKey)
  }

  const adminToken = (subject: string, aal: string): Promise<string> => tokenFor(subject, { app_metadata: { role: 'admin' }, aal })
  const get = (path: string, token: string) => request(app.getHttpServer()).get(path).set('authorization', `Bearer ${token}`)

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256')
    privateKey = pair.privateKey
    const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'ES256' }
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 1_000 }])],
      controllers: [WalletController, SessionController, TestAdminShopsController, TestForgottenAdminController, TestPublicAdminController],
      providers: [
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: JWKS, useValue: createLocalJWKSet({ keys: [publicJwk] }) },
        { provide: WalletService, useValue: { listCards: async () => ({ ok: true, value: [] }) } },
        SessionService,
        { provide: SessionRepository, useValue: new NoShopSessionRepository() },
        MerchantShopGuard,
        { provide: MerchantShopResolver, useValue: new NoShopResolver() },
        AdminGuard,
        { provide: AdminUsersReader, useValue: new FakeAdminUsersReader() },
        // Mesma ordem do AppModule: JWT, limite por usuário, separação de papéis.
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

  describe('an admin token outside the admin surface', () => {
    it.each(['aal1', 'aal2'])('is refused on the customer wallet (%s)', async (aal) => {
      const res = await get('/v1/wallet/cards', await adminToken(ACTIVE_ADMIN, aal)).expect(403)
      expect(res.body).toEqual({ code: 'forbidden' })
    })

    it.each(['aal1', 'aal2'])('is refused on the merchant session (%s)', async (aal) => {
      const res = await get('/v1/merchant/session', await adminToken(ACTIVE_ADMIN, aal)).expect(403)
      expect(res.body).toEqual({ code: 'forbidden' })
    })

  })

  describe('a route under /admin that forgot @AdminSurface()', () => {
    it.each([
      ['an active admin with MFA', () => adminToken(ACTIVE_ADMIN, 'aal2')],
      ['a customer', () => tokenFor(CUSTOMER)],
    ])('refuses %s', async (_name, token) => {
      const res = await get('/v1/admin/forgotten', await token()).expect(403)
      expect(res.body).toEqual({ code: 'forbidden' })
    })
  })

  it('refuses a public route on the admin surface, with or without a token', async () => {
    const anonymous = await request(app.getHttpServer()).get('/v1/admin/public-by-mistake').expect(403)
    expect(anonymous.body).toEqual({ code: 'forbidden' })
    await get('/v1/admin/public-by-mistake', await adminToken(ACTIVE_ADMIN, 'aal2')).expect(403)
  })

  describe('a customer token', () => {
    it('still reaches the wallet and the merchant session', async () => {
      const token = await tokenFor(CUSTOMER)
      await get('/v1/wallet/cards', token).expect(200)
      const session = await get('/v1/merchant/session', token).expect(404)
      expect(session.body).toEqual({ code: 'notFound', entity: 'merchant' })
    })

    it('is refused on the admin surface', async () => {
      const res = await get('/v1/admin/shops', await tokenFor(CUSTOMER)).expect(403)
      expect(res.body).toEqual({ code: 'forbidden' })
    })

    it.each([
      ['a role set outside app_metadata', { role: 'admin', aal: 'aal2' }],
      ['user_metadata, which the user can write', { user_metadata: { role: 'admin' }, aal: 'aal2' }],
      ['an unknown role in app_metadata', { app_metadata: { role: 'superadmin' }, aal: 'aal2' }],
    ])('is not an admin with %s', async (_name, claims) => {
      const token = await tokenFor(ACTIVE_ADMIN, claims)
      await get('/v1/wallet/cards', token).expect(200)
      await get('/v1/admin/shops', token).expect(403)
    })
  })

  describe('the admin surface', () => {
    it.each([
      ['an admin without MFA (aal1)', () => adminToken(ACTIVE_ADMIN, 'aal1')],
      ['an admin with no aal claim', () => tokenFor(ACTIVE_ADMIN, { app_metadata: { role: 'admin' } })],
      ['an admin with an unknown aal', () => tokenFor(ACTIVE_ADMIN, { app_metadata: { role: 'admin' }, aal: 'aal3' })],
      ['a disabled admin with MFA', () => adminToken(DISABLED_ADMIN, 'aal2')],
      ['an admin role with no admin_users row', () => adminToken(UNREGISTERED_ADMIN, 'aal2')],
    ])('refuses %s with the same 403', async (_name, token) => {
      const res = await get('/v1/admin/shops', await token()).expect(403)
      expect(res.body).toEqual({ code: 'forbidden' })
    })

    it('lets an active admin with MFA (aal2) in and hands the controller its id', async () => {
      const res = await get('/v1/admin/shops', await adminToken(ACTIVE_ADMIN, 'aal2')).expect(200)
      expect(res.body).toEqual({ adminId: ACTIVE_ADMIN })
    })

    it('still asks for a token', async () => {
      await request(app.getHttpServer()).get('/v1/admin/shops').expect(401)
    })
  })
})
