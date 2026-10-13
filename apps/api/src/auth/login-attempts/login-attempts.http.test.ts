import { type INestApplication, Logger } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { LoginAttemptGate } from './login-attempt-gate'
import { LoginAttemptsController } from './login-attempts.controller'

const SECRET = 'bff-test-secret-bff-test-secret-0123'
const PHONE = '67991230374'

class ScriptedGate {
  allowed = true
  readonly asked: string[] = []
  async allow(phone: string): Promise<boolean> {
    this.asked.push(phone)
    return this.allowed
  }
}

async function appWith(secret: string | undefined, gate: ScriptedGate): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [LoginAttemptsController],
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

describe('POST /auth/login-attempts', () => {
  let app: INestApplication
  const gate = new ScriptedGate()

  beforeAll(async () => {
    app = await appWith(SECRET, gate)
  })
  afterAll(() => app.close())
  beforeEach(() => {
    gate.allowed = true
    gate.asked.length = 0
  })
  afterEach(() => vi.restoreAllMocks())

  const post = (headers: Record<string, string>, body: unknown) =>
    request(app.getHttpServer()).post('/auth/login-attempts').set(headers).send(body as object)

  it('answers 204 while the phone is under its cap', async () => {
    await post({ 'x-bff-secret': SECRET }, { phone: PHONE }).expect(204)
    expect(gate.asked).toEqual([PHONE])
  })

  it('answers 429 rateLimited once the gate refuses, and logs it without the phone', async () => {
    gate.allowed = false
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    await post({ 'x-bff-secret': SECRET }, { phone: PHONE }).expect(429, { code: 'rateLimited' })
    const lines = warn.mock.calls.map(([line]) => String(line))
    expect(lines.some((line) => line.includes('rateLimit.hit'))).toBe(true)
    expect(lines.join('\n')).not.toContain('991230374')
  })

  it.each([
    ['no secret', {}],
    ['a wrong secret', { 'x-bff-secret': 'not-the-bff-secret-not-the-bff-secret' }],
  ])('refuses %s without touching the counter', async (_name, headers) => {
    await post(headers, { phone: PHONE }).expect(401)
    expect(gate.asked).toEqual([])
  })

  it('refuses an invalid phone with 400', async () => {
    await post({ 'x-bff-secret': SECRET }, { phone: '123' }).expect(400)
    expect(gate.asked).toEqual([])
  })
})

describe('POST /auth/login-attempts without a configured secret', () => {
  it('refuses every caller (nobody is the BFF)', async () => {
    const gate = new ScriptedGate()
    const app = await appWith(undefined, gate)
    await request(app.getHttpServer()).post('/auth/login-attempts').set({ 'x-bff-secret': SECRET }).send({ phone: PHONE }).expect(401)
    expect(gate.asked).toEqual([])
    await app.close()
  })
})
