import { type INestApplication, Logger } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminEventKind } from '#shared/schemas/admin'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { JWKS } from '../../auth/jwks'
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard'
import { SurfaceRoleGuard } from '../../auth/surface-role.guard'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { Clock, SystemClock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { PiiService } from '../../common/pii.service'
import { ENV } from '../../config/config.module'
import { FakeAdminAuth } from '../../test-support/fake-admin-auth'
import { createTestPii } from '../../test-support/pii'
import { AdminGuard } from '../access/admin.guard'
import { AdminUsersReader } from '../access/admin-users.reader'
import { AdminAuth } from './admin-auth'
import { AdminTeamController } from './team.controller'
import { type AdminRecord, AdminTeamRepository, type NewAdmin, type StatusChangeDecision, type StatusChangeError } from './team.repository'
import { AdminTeamService } from './team.service'

const ISSUER = 'https://project.supabase.co/auth/v1'
const ADMIN = '0190a000-0000-7000-8000-00000000a001'
const OTHER = '0190a000-0000-7000-8000-00000000a002'
const UNKNOWN = '0190a000-0000-7000-8000-00000000a0ff'
const CUSTOMER = '0190a000-0000-7000-8000-00000000c001'

/** Equipe na memória, com o mesmo contrato do Drizzle: e-mail único, evento junto de cada escrita. */
class InMemoryTeamRepository extends AdminTeamRepository {
  readonly rows = new Map<string, AdminRecord & { emailHash: string; invitedBy: string | null }>()
  readonly events: { actorAdminId: string; kind: AdminEventKind; targetAdminId: string }[] = []
  /** Simula a corrida em que outro pedido grava o mesmo e-mail entre a checagem e o insert. */
  raceOnInsert = false
  failEvents = false

  seed(id: string, name: string, emailEncrypted: Buffer, emailHash: Buffer, disabledAt: Date | null = null): void {
    this.rows.set(id, { id, name, emailEncrypted, emailHash: emailHash.toString('hex'), invitedBy: null, disabledAt, createdAt: new Date('2026-10-01T12:00:00Z') })
  }

  list = async (limit: number): Promise<readonly AdminRecord[]> => [...this.rows.values()].slice(0, limit)
  find = async (id: string): Promise<AdminRecord | null> => this.rows.get(id) ?? null
  emailTaken = async (emailHash: Buffer): Promise<boolean> => [...this.rows.values()].some((row) => row.emailHash === emailHash.toString('hex'))
  insert = async (admin: NewAdmin): Promise<Result<AdminRecord, ErrorOf<'alreadyExists'>>> => {
    if (this.raceOnInsert || (await this.emailTaken(admin.emailHash))) return err({ code: 'alreadyExists' })
    const row = { id: admin.id, name: admin.name, emailEncrypted: admin.emailEncrypted, emailHash: admin.emailHash.toString('hex'), invitedBy: admin.invitedBy, disabledAt: null, createdAt: new Date() }
    this.rows.set(admin.id, row)
    this.events.push({ actorAdminId: admin.actorAdminId, kind: 'invite', targetAdminId: admin.id })
    return ok(row)
  }
  changeStatus = async (id: string, actorAdminId: string, decide: StatusChangeDecision): Promise<Result<AdminRecord, StatusChangeError>> => {
    const actor = this.rows.get(actorAdminId)
    if (actor === undefined || actor.disabledAt !== null) return err({ code: 'forbidden' })
    const row = this.rows.get(id)
    if (!row) return err({ code: 'notFound', entity: 'adminUser' })
    const change = decide(row)
    if (!change.ok) return change
    const updated = { ...row, disabledAt: change.value.disabledAt }
    this.rows.set(id, updated)
    this.events.push({ actorAdminId, kind: change.value.disabledAt === null ? 'reactivate' : 'disable', targetAdminId: id })
    return ok(updated)
  }
  recordEvent = async (actorAdminId: string, kind: AdminEventKind, targetAdminId: string): Promise<void> => {
    if (this.failEvents) throw new Error('database down')
    this.events.push({ actorAdminId, kind, targetAdminId })
  }
}

/** Ativo = linha na equipe sem `disabledAt`: o mesmo que o `DrizzleAdminUsersReader` lê. */
class TeamBackedReader extends AdminUsersReader {
  constructor(private readonly team: InMemoryTeamRepository) {
    super()
  }
  async isActiveAdmin(userId: string): Promise<boolean> {
    const row = this.team.rows.get(userId)
    return row !== undefined && row.disabledAt === null
  }
}

describe('admin team (HTTP)', () => {
  let app: INestApplication
  let privateKey: CryptoKey
  const pii = createTestPii()
  const repository = new InMemoryTeamRepository()
  const auth = new FakeAdminAuth()

  const token = (subject: string, claims: Record<string, unknown> = {}): Promise<string> =>
    new SignJWT(claims).setProtectedHeader({ alg: 'ES256', kid: 'test' }).setIssuer(ISSUER).setAudience('authenticated').setSubject(subject).setExpirationTime('5m').sign(privateKey)
  const adminToken = (subject = ADMIN): Promise<string> => token(subject, { app_metadata: { role: 'admin' }, aal: 'aal2' })
  const as = (method: 'get' | 'post', path: string, jwt: string) => request(app.getHttpServer())[method](path).set('authorization', `Bearer ${jwt}`)

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256')
    privateKey = pair.privateKey
    const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'ES256' }
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 1_000 }])],
      controllers: [AdminTeamController],
      providers: [
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: JWKS, useValue: createLocalJWKSet({ keys: [publicJwk] }) },
        { provide: PiiService, useValue: pii },
        { provide: Clock, useClass: SystemClock },
        AdminTeamService,
        { provide: AdminTeamRepository, useValue: repository },
        { provide: AdminAuth, useValue: auth },
        AdminGuard,
        { provide: AdminUsersReader, useValue: new TeamBackedReader(repository) },
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
  afterEach(() => vi.restoreAllMocks())

  beforeEach(() => {
    repository.rows.clear()
    repository.events.length = 0
    repository.raceOnInsert = false
    repository.failEvents = false
    auth.invited.length = 0
    auth.cancelled.length = 0
    auth.mfaResets.length = 0
    auth.inviteFailure = null
    auth.mfaFailure = null
    repository.seed(ADMIN, 'Ana da Rede', pii.encryptEmail('ana@rede.test'), pii.hashEmail('ana@rede.test'))
    repository.seed(OTHER, 'Bia da Rede', pii.encryptEmail('bia@rede.test'), pii.hashEmail('bia@rede.test'))
  })

  it('lists the team with each e-mail in clear', async () => {
    const res = await as('get', '/v1/admin/team', await adminToken()).expect(200)
    expect(res.body).toEqual([
      { id: ADMIN, name: 'Ana da Rede', email: 'ana@rede.test', disabledAt: null, createdAt: '2026-10-01T12:00:00.000Z' },
      { id: OTHER, name: 'Bia da Rede', email: 'bia@rede.test', disabledAt: null, createdAt: '2026-10-01T12:00:00.000Z' },
    ])
  })

  it('invites with the normalized e-mail and records who invited', async () => {
    const res = await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Caio', email: 'Caio@Rede.test' }).expect(201)
    const [invited] = auth.invited
    expect(invited).toMatchObject({ email: 'caio@rede.test', name: 'Caio' })
    expect(res.body).toMatchObject({ id: invited?.userId, name: 'Caio', email: 'caio@rede.test', disabledAt: null })
    expect(repository.rows.get(invited?.userId ?? '')?.invitedBy).toBe(ADMIN)
    expect(repository.events).toEqual([{ actorAdminId: ADMIN, kind: 'invite', targetAdminId: invited?.userId }])
  })

  it('refuses the e-mail of a team member (disabled included) with 409 alreadyExists, without calling Supabase', async () => {
    repository.seed('0190a000-0000-7000-8000-00000000a003', 'Dani', pii.encryptEmail('dani@rede.test'), pii.hashEmail('dani@rede.test'), new Date())
    const res = await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Dani', email: 'DANI@rede.test' }).expect(409)
    expect(res.body).toEqual({ code: 'alreadyExists' })
    expect(auth.invited).toEqual([])
  })

  it('passes on alreadyExists from Supabase (an e-mail with a customer or merchant account is never promoted)', async () => {
    auth.inviteFailure = { code: 'alreadyExists' }
    const res = await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Caio', email: 'caio@rede.test' }).expect(409)
    expect(res.body).toEqual({ code: 'alreadyExists' })
    expect(repository.events).toEqual([])
  })

  it('undoes the Supabase account when the row loses a race for the same e-mail', async () => {
    repository.raceOnInsert = true
    await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Caio', email: 'caio@rede.test' }).expect(409)
    expect(auth.cancelled).toEqual([auth.invited[0]?.userId])
  })

  it('answers 503 when Supabase is down', async () => {
    auth.inviteFailure = { code: 'network' }
    await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Caio', email: 'caio@rede.test' }).expect(503, { code: 'network' })
  })

  it('refuses an invalid invite with 400', async () => {
    await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'C', email: 'caio@rede.test' }).expect(400)
    await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Caio', email: 'not-an-email' }).expect(400)
    await as('post', '/v1/admin/team/invite', await adminToken()).send({ name: 'Caio', email: 'caio@rede.test', role: 'owner' }).expect(400)
  })

  it('disables someone else, records it, and the disabled admin is refused from the next request on', async () => {
    const res = await as('post', `/v1/admin/team/${OTHER}/disable`, await adminToken()).expect(200)
    expect(res.body.disabledAt).toEqual(expect.any(String))
    expect(repository.events).toEqual([{ actorAdminId: ADMIN, kind: 'disable', targetAdminId: OTHER }])
    await as('get', '/v1/admin/team', await adminToken(OTHER)).expect(403, { code: 'forbidden' })
  })

  it('reactivates, records it, and the admin passes the guard again', async () => {
    await as('post', `/v1/admin/team/${OTHER}/disable`, await adminToken()).expect(200)
    const res = await as('post', `/v1/admin/team/${OTHER}/reactivate`, await adminToken()).expect(200)
    expect(res.body.disabledAt).toBeNull()
    expect(repository.events.map((event) => event.kind)).toEqual(['disable', 'reactivate'])
    await as('get', '/v1/admin/team', await adminToken(OTHER)).expect(200)
  })

  it('refuses to disable an already disabled admin or reactivate an active one with 409 invalidTransition', async () => {
    await as('post', `/v1/admin/team/${OTHER}/reactivate`, await adminToken()).expect(409, { code: 'invalidTransition' })
    await as('post', `/v1/admin/team/${OTHER}/disable`, await adminToken()).expect(200)
    await as('post', `/v1/admin/team/${OTHER}/disable`, await adminToken()).expect(409, { code: 'invalidTransition' })
  })

  it.each(['disable', 'reactivate', 'reset-mfa'])('refuses %s on oneself with 403 forbidden, recording nothing', async (action) => {
    await as('post', `/v1/admin/team/${ADMIN}/${action}`, await adminToken()).expect(403, { code: 'forbidden' })
    expect(repository.events).toEqual([])
    expect(auth.mfaResets).toEqual([])
    expect(repository.rows.get(ADMIN)?.disabledAt).toBeNull()
  })

  it('resets the MFA of someone else and records it', async () => {
    const res = await as('post', `/v1/admin/team/${OTHER}/reset-mfa`, await adminToken()).expect(200)
    expect(res.body).toMatchObject({ id: OTHER, email: 'bia@rede.test' })
    expect(auth.mfaResets).toEqual([OTHER])
    expect(repository.events).toEqual([{ actorAdminId: ADMIN, kind: 'resetMfa', targetAdminId: OTHER }])
  })

  it('records no reset when Supabase did not delete the factors', async () => {
    auth.mfaFailure = { code: 'network' }
    await as('post', `/v1/admin/team/${OTHER}/reset-mfa`, await adminToken()).expect(503, { code: 'network' })
    expect(repository.events).toEqual([])
  })

  it('warns with ids only (no e-mail) when the reset happened but its audit row could not be written', async () => {
    repository.failEvents = true
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    await as('post', `/v1/admin/team/${OTHER}/reset-mfa`, await adminToken()).expect(500, { code: 'internal' })
    const lines = warn.mock.calls.map(([line]) => String(line))
    const audit = lines.find((line) => line.includes('admin.mfaReset'))
    expect(JSON.parse(audit ?? '{}')).toMatchObject({ type: 'security', event: 'admin.mfaReset', outcome: 'failure', code: 'auditNotRecorded', userId: ADMIN, targetId: OTHER })
    expect(lines.join('\n')).not.toContain('@rede.test')
  })

  it.each(['disable', 'reactivate', 'reset-mfa'])('answers 404 for %s on someone outside the team, without calling Supabase', async (action) => {
    await as('post', `/v1/admin/team/${UNKNOWN}/${action}`, await adminToken()).expect(404, { code: 'notFound', entity: 'adminUser' })
    expect(auth.mfaResets).toEqual([])
  })

  it('refuses an id that is not a uuid with 400', async () => {
    await as('post', '/v1/admin/team/not-a-uuid/disable', await adminToken()).expect(400)
  })

  it('refuses a customer token and an admin without MFA', async () => {
    await as('get', '/v1/admin/team', await token(CUSTOMER)).expect(403)
    await as('post', `/v1/admin/team/${OTHER}/disable`, await token(ADMIN, { app_metadata: { role: 'admin' }, aal: 'aal1' })).expect(403)
    expect(repository.events).toEqual([])
  })
})
