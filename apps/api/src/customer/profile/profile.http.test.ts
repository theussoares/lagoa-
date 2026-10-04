import { type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { TERMS_VERSION } from '#shared/constants/domain'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Result } from '#shared/types/result'
import { ok } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { createTestPii } from '../../test-support/pii'
import { ProfileController } from './profile.controller'
import {
  type ProfileNotFound,
  type ProfilePatch,
  type ProfileRecord,
  ProfileRepository,
} from './profile.repository'
import { ProfileService } from './profile.service'
import { profileRecord } from './profile.fixtures'

const pii = createTestPii()
const USER_ID = TEST_USER.id
const NOW = new Date('2026-10-03T12:00:00Z')
const now = { current: NOW }

class InMemoryProfileRepository extends ProfileRepository {
  record: ProfileRecord | null = null
  async findByUserId(userId: string): Promise<ProfileRecord | null> {
    return this.record?.userId === userId ? this.record : null
  }
  async findTerms(): Promise<Pick<ProfileRecord, 'termsAcceptedAt' | 'termsVersion'> | null> {
    return this.record
  }
  async update<E>(
    userId: string,
    decide: (current: ProfileRecord) => Result<ProfilePatch, E>,
  ): Promise<Result<ProfileRecord, E | ProfileNotFound>> {
    if (this.record?.userId !== userId) return { ok: false, error: { code: 'notFound', entity: 'customer' } }
    const decision = decide(this.record)
    if (!decision.ok) return decision
    this.record = { ...this.record, ...decision.value }
    return ok(this.record)
  }
}

describe('customer profile HTTP', () => {
  let app: INestApplication
  const repository = new InMemoryProfileRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        ProfileService,
        { provide: ProfileRepository, useValue: repository },
        { provide: PiiService, useValue: pii },
        { provide: Clock, useValue: { now: () => now.current } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    now.current = NOW
    repository.record = profileRecord({ userId: USER_ID, phoneEncrypted: pii.encrypt('67991230374') })
  })

  it('returns the profile with a masked phone and never the raw one', async () => {
    const response = await request(app.getHttpServer()).get('/customer/profile').expect(200)
    expect(response.body.maskedPhone).toBe('(67) 9••••-0374')
    expect(JSON.stringify(response.body)).not.toContain('67991230374')
  })

  it('answers 404 with a domain error when the user has no customer profile yet', async () => {
    repository.record = null
    const response = await request(app.getHttpServer()).get('/customer/profile').expect(404)
    expect(response.body).toEqual({ code: 'notFound', entity: 'customer' })
  })

  it('updates name and birthday', async () => {
    const response = await request(app.getHttpServer())
      .put('/customer/profile')
      .send({ firstName: '  Ana ', birthday: '03-14' })
      .expect(200)
    expect(response.body).toMatchObject({ firstName: 'Ana', birthday: '03-14' })
    expect(response.body.birthdayChangeableAt).toBe('2027-10-03T12:00:00.000Z')
  })

  it('answers 409 birthdayLocked while the cooldown runs', async () => {
    repository.record = profileRecord({
      userId: USER_ID,
      phoneEncrypted: pii.encrypt('67991230374'),
      birthday: '03-14',
      birthdayChangedAt: new Date('2026-06-01T12:00:00Z'),
    })
    const response = await request(app.getHttpServer())
      .put('/customer/profile')
      .send({ firstName: null, birthday: '07-01' })
      .expect(409)
    expect(response.body).toEqual({ code: 'birthdayLocked', changeableAt: '2027-06-01T12:00:00.000Z' })
  })

  it('rejects an invalid birthday without echoing the value back', async () => {
    const response = await request(app.getHttpServer())
      .put('/customer/profile')
      .send({ firstName: 'Ana', birthday: '13-40' })
      .expect(400)
    expect(response.body.code).toBe('validation')
    expect(JSON.stringify(response.body)).not.toContain('13-40')
  })

  it('grants and revokes notification consent', async () => {
    const granted = await request(app.getHttpServer()).put('/customer/profile/consent').send({ granted: true }).expect(200)
    expect(granted.body.consent).toEqual({ notifications: true, updatedAt: NOW.toISOString() })
    const revoked = await request(app.getHttpServer()).put('/customer/profile/consent').send({ granted: false }).expect(200)
    expect(revoked.body.consent.notifications).toBe(false)
  })

  it('rejects a consent body that is not an explicit boolean', async () => {
    await request(app.getHttpServer()).put('/customer/profile/consent').send({ granted: 'yes' }).expect(400)
  })

  it('accepts terms once and keeps the first timestamp', async () => {
    await request(app.getHttpServer()).post('/customer/profile/terms').expect(200)
    expect(repository.record?.termsAcceptedAt).toEqual(NOW)
    expect(repository.record?.termsVersion).toBe(TERMS_VERSION)
    now.current = new Date('2026-12-25T12:00:00Z')
    await request(app.getHttpServer()).post('/customer/profile/terms').expect(200)
    expect(repository.record?.termsAcceptedAt).toEqual(NOW)
  })
})
