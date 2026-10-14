import type { INestApplication } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { OtpChannel } from '#shared/schemas/session'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { OtpChannelChoice } from './otp-channel-choice'
import { OtpChannelController } from './otp-channel.controller'

const SECRET = 'bff-test-secret-bff-test-secret-0123'
const PHONE = '67991230374'

class RecordingChoice {
  readonly chosen: Array<{ phone: string; channel: OtpChannel }> = []
  async choose(phone: string, channel: OtpChannel): Promise<void> {
    this.chosen.push({ phone, channel })
  }
}

describe('POST /auth/otp-channel', () => {
  let app: INestApplication
  const choice = new RecordingChoice()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OtpChannelController],
      providers: [
        { provide: ENV, useValue: { BFF_SHARED_SECRET: SECRET } },
        { provide: OtpChannelChoice, useValue: choice },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    choice.chosen.length = 0
  })

  const post = (headers: Record<string, string>, body: unknown) =>
    request(app.getHttpServer()).post('/auth/otp-channel').set(headers).send(body as object)

  it('records the chosen channel for the BFF', async () => {
    await post({ 'x-bff-secret': SECRET }, { phone: PHONE, channel: 'sms' }).expect(204)
    expect(choice.chosen).toEqual([{ phone: PHONE, channel: 'sms' }])
  })

  it('defaults to WhatsApp when the channel is omitted', async () => {
    await post({ 'x-bff-secret': SECRET }, { phone: PHONE }).expect(204)
    expect(choice.chosen).toEqual([{ phone: PHONE, channel: 'whatsapp' }])
  })

  it.each([
    ['no secret', {}],
    ['a wrong secret', { 'x-bff-secret': 'not-the-bff-secret-not-the-bff-secret' }],
  ])('refuses %s without recording anything', async (_name, headers) => {
    await post(headers, { phone: PHONE, channel: 'sms' }).expect(401)
    expect(choice.chosen).toEqual([])
  })

  it.each([
    ['an unknown channel', { phone: PHONE, channel: 'telegram' }],
    ['an invalid phone', { phone: '123', channel: 'sms' }],
  ])('refuses %s with 400', async (_name, body) => {
    await post({ 'x-bff-secret': SECRET }, body).expect(400)
    expect(choice.chosen).toEqual([])
  })
})
