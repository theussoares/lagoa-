import { type INestApplication, Logger } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { RateLimitStorageUnavailableError } from '../../throttling/postgres-throttler.storage'
import { UserThrottlerGuard } from '../user-throttler.guard'
import { AdminLoginAttemptsController } from './admin-login-attempts.controller'
import { type AttemptVerdict, LoginAttemptGate } from './login-attempt-gate'

const SECRET = 'bff-test-secret-bff-test-secret-0123'
const EMAIL = 'ana@rede.test'
const PATH = '/auth/admin-login-attempts'

class ScriptedGate {
  verdict: AttemptVerdict = 'allowed'
  readonly asked: string[] = []
  async reserveAdminLogin(email: string): Promise<AttemptVerdict> {
    this.asked.push(email)
    return this.verdict
  }
}

async function appWith(secret: string | undefined, gate: ScriptedGate): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminLoginAttemptsController],
    providers: [
      { provide: ENV, useValue: { BFF_SHARED_SECRET: secret } },
      { provide: LoginAttemptGate, useValue: gate },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
  }).compile()
  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}

describe('POST /auth/admin-login-attempts', () => {
  let app: INestApplication
  const gate = new ScriptedGate()

  beforeAll(async () => {
    app = await appWith(SECRET, gate)
  })
  afterAll(() => app.close())
  beforeEach(() => {
    gate.verdict = 'allowed'
    gate.asked.length = 0
  })
  afterEach(() => vi.restoreAllMocks())

  const post = (headers: Record<string, string>, body: unknown) => request(app.getHttpServer()).post(PATH).set(headers).send(body as object)

  it('answers 204 while the e-mail is under its cap, passing the normalized e-mail to the gate', async () => {
    await post({ 'x-bff-secret': SECRET }, { email: '  Ana@Rede.TEST ' }).expect(204)
    expect(gate.asked).toEqual([EMAIL])
  })

  it('answers 429 rateLimited past the cap, and logs it without the e-mail', async () => {
    gate.verdict = 'refused'
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    await post({ 'x-bff-secret': SECRET }, { email: EMAIL }).expect(429, { code: 'rateLimited' })
    const lines = warn.mock.calls.map(([line]) => String(line))
    expect(lines.some((line) => line.includes('rateLimit.hit'))).toBe(true)
    expect(lines.join('\n')).not.toContain('ana@')
  })

  it('answers 503 when the counter is down (fail-closed: no attempt goes through uncounted)', async () => {
    gate.verdict = 'unavailable'
    await post({ 'x-bff-secret': SECRET }, { email: EMAIL }).expect(503, { code: 'network' })
  })

  it.each([
    ['no secret', {}],
    ['a wrong secret', { 'x-bff-secret': 'not-the-bff-secret-not-the-bff-secret' }],
  ])('refuses %s with 401 without touching the counter', async (_name, headers) => {
    await post(headers, { email: EMAIL }).expect(401)
    expect(gate.asked).toEqual([])
  })

  it('refuses an invalid body with 400', async () => {
    await post({ 'x-bff-secret': SECRET }, { email: 'not-an-email' }).expect(400)
    await post({ 'x-bff-secret': SECRET }, { email: EMAIL, password: 'x' }).expect(400)
    expect(gate.asked).toEqual([])
  })
})

describe('POST /auth/admin-login-attempts without a configured secret', () => {
  it('refuses every caller (nobody is the BFF)', async () => {
    const gate = new ScriptedGate()
    const app = await appWith(undefined, gate)
    await request(app.getHttpServer()).post(PATH).set({ 'x-bff-secret': SECRET }).send({ email: EMAIL }).expect(401)
    expect(gate.asked).toEqual([])
    await app.close()
  })
})

describe('POST /auth/admin-login-attempts when the shared request counter is down', () => {
  it('is refused by the global throttler (@FailClosedThrottle) before reaching the gate', async () => {
    const gate = new ScriptedGate()
    const down = {
      increment: async (): Promise<never> => {
        throw new RateLimitStorageUnavailableError()
      },
    }
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ storage: down, throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] })],
      controllers: [AdminLoginAttemptsController],
      providers: [
        { provide: ENV, useValue: { BFF_SHARED_SECRET: SECRET } },
        { provide: LoginAttemptGate, useValue: gate },
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    const app = moduleRef.createNestApplication()
    await app.init()
    await request(app.getHttpServer()).post(PATH).set({ 'x-bff-secret': SECRET }).send({ email: EMAIL }).expect(429, { code: 'rateLimited' })
    expect(gate.asked).toEqual([])
    await app.close()
  })
})
