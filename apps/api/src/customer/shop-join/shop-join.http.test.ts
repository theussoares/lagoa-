import { Logger, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { FixedProfileRepository } from '../../test-support/fixed-profile.repository'
import { acceptedProfile } from '../profile/profile.fixtures'
import { ProfileRepository } from '../profile/profile.repository'
import { CARD_ID, FakeShopJoinRepository, joinableShop, SHOP_ID } from './shop-join.fixtures'
import { ShopJoinController } from './shop-join.controller'
import { ShopJoinRepository } from './shop-join.repository'
import { ShopJoinService } from './shop-join.service'

const PHONE = '67991230374'

async function buildApp(repository: FakeShopJoinRepository, profiles: FixedProfileRepository, options: { throttled: boolean }): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: options.throttled
      ? [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }, { name: 'ip', ttl: 60_000, limit: 600, getTracker: (req) => String(req.ip ?? 'unknown') }])]
      : [],
    controllers: [ShopJoinController],
    providers: [
      ShopJoinService,
      { provide: ShopJoinRepository, useValue: repository },
      { provide: Clock, useValue: { now: () => new Date('2026-10-03T12:00:00Z') } },
      { provide: ProfileRepository, useValue: profiles },
      { provide: APP_GUARD, useClass: FakeAuthGuard },
      ...(options.throttled ? [{ provide: APP_GUARD, useClass: UserThrottlerGuard }] : []),
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
  }).compile()
  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}

describe('shop-join HTTP', () => {
  let app: INestApplication
  const profiles = new FixedProfileRepository(acceptedProfile())
  const repository = new FakeShopJoinRepository()

  beforeAll(async () => {
    app = await buildApp(repository, profiles, { throttled: false })
  })
  afterAll(async () => app.close())
  afterEach(() => {
    repository.shop = joinableShop()
    repository.existingCardId = null
    repository.failure = null
  })

  const post = (body: unknown) => request(app.getHttpServer()).post('/shop-join').send(body as object)

  it('answers 200 with the join result', async () => {
    const response = await post({ code: 'NAV4K7' }).expect(200)
    expect(response.body).toEqual({ shopId: SHOP_ID, cardId: CARD_ID, alreadyMember: false })
  })

  it('answers 200 alreadyMember for someone who already has the card', async () => {
    repository.existingCardId = CARD_ID
    const response = await post({ code: 'NAV4K7' }).expect(200)
    expect(response.body).toMatchObject({ alreadyMember: true })
  })

  it.each([{}, { code: 123 }, { code: 'x'.repeat(33) }, { code: 'NAV4K7', amountCents: 100 }, { code: 'NAV4K7', shopId: SHOP_ID }])('answers 400 for a malformed body or an extra field %j', async (body) => {
    await post(body).expect(400)
  })

  it('answers 404 invalidShopQr for an unknown, pending or suspended shop', async () => {
    repository.shop = null
    const response = await post({ code: 'NAV4K7' }).expect(404)
    expect(response.body).toEqual({ code: 'invalidShopQr' })
  })

  it('answers 404 invalidShopQr for a code that cannot exist', async () => {
    const response = await post({ code: '123' }).expect(404)
    expect(response.body).toEqual({ code: 'invalidShopQr' })
  })

  it('answers 403 checkInDisabled when the shop does not accept joining', async () => {
    repository.shop = joinableShop({ joinEnabled: false })
    const response = await post({ code: 'NAV4K7' }).expect(403)
    expect(response.body).toEqual({ code: 'checkInDisabled' })
  })

  it('answers 403 termsNotAccepted, and writes nothing, until the customer accepts the current terms', async () => {
    const before = profiles.record
    repository.joins = []
    profiles.record = acceptedProfile({ termsAcceptedAt: null, termsVersion: null })
    expect((await post({ code: 'NAV4K7' }).expect(403)).body).toEqual({ code: 'termsNotAccepted' })
    profiles.record = acceptedProfile({ termsVersion: '2020-01' })
    await post({ code: 'NAV4K7' }).expect(403)
    expect(repository.joins).toHaveLength(0)
    profiles.record = before
  })
})

describe('shop-join HTTP throttling', () => {
  let app: INestApplication
  beforeAll(async () => {
    app = await buildApp(new FakeShopJoinRepository(), new FixedProfileRepository(acceptedProfile()), { throttled: true })
  })
  afterAll(async () => app.close())

  it('answers 429 rateLimited on the 11th attempt in a minute', async () => {
    const post = () => request(app.getHttpServer()).post('/shop-join').send({ code: 'NAV4K7' })
    for (let attempt = 1; attempt <= 10; attempt += 1) await post().expect(200)
    expect((await post().expect(429)).body).toEqual({ code: 'rateLimited' })
  })
})

describe('shop-join logging (CA-26)', () => {
  const logged: string[] = []
  const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) =>
    vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
      logged.push(String(message))
    }),
  )
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logged.push(args.map(String).join(' '))
  })
  afterAll(() => {
    for (const spy of spies) spy.mockRestore()
    consoleSpy.mockRestore()
  })

  it('writes neither phone nor e-mail on success, refusal or an unexpected error', async () => {
    const repository = new FakeShopJoinRepository()
    const app = await buildApp(repository, new FixedProfileRepository(acceptedProfile({ phoneEncrypted: Buffer.from(PHONE) })), { throttled: false })
    const post = () => request(app.getHttpServer()).post('/shop-join').send({ code: 'NAV4K7' })
    logged.length = 0

    await post().expect(200)
    repository.shop = joinableShop({ joinEnabled: false })
    await post().expect(403)
    repository.shop = null
    await post().expect(404)
    repository.shop = joinableShop()
    repository.failure = new Error(`driver says: key (phone)=(${PHONE}) (email)=(${TEST_USER.email})`)
    await post().expect(500)

    expect(logged.length).toBeGreaterThan(0)
    for (const line of logged) {
      expect(line).not.toContain(PHONE)
      expect(line).not.toContain(TEST_USER.email ?? 'unreachable-email')
    }
    await app.close()
  })
})
