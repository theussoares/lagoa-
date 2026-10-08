import { createHmac } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PhoneNumber } from '#shared/schemas/phone'
import { ENV } from '../../config/config.module'
import { SendSmsHookController } from './send-sms-hook.controller'
import { SmsSendGate } from './sms-send-gate'
import { SmsSender } from './sms-sender'

const KEY = Buffer.from('hook-test-secret-hook-test-secret')
const SECRET = `v1,whsec_${KEY.toString('base64')}`

class RecordingSmsSender extends SmsSender {
  sent: Array<{ phone: PhoneNumber; message: string }> = []
  accepts = true
  async send(phone: PhoneNumber, message: string): Promise<boolean> {
    this.sent.push({ phone, message })
    return this.accepts
  }
}

function signed(body: string, at = Math.floor(Date.now() / 1000)): Record<string, string> {
  const signature = createHmac('sha256', KEY).update(`msg_1.${at}.${body}`).digest('base64')
  return { 'content-type': 'application/json', 'webhook-id': 'msg_1', 'webhook-timestamp': String(at), 'webhook-signature': `v1,${signature}` }
}

const PAYLOAD = JSON.stringify({ user: { phone: '5567991230374' }, sms: { otp: '123456' } })

class ScriptedGate {
  allowed = true
  async allow(): Promise<boolean> {
    return this.allowed
  }
}

describe('Send SMS hook', () => {
  let app: INestApplication
  const sender = new RecordingSmsSender()
  const gate = new ScriptedGate()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SendSmsHookController],
      providers: [{ provide: ENV, useValue: { SEND_SMS_HOOK_SECRET: SECRET } }, { provide: SmsSender, useValue: sender }, { provide: SmsSendGate, useValue: gate }],
    }).compile()
    app = moduleRef.createNestApplication({ rawBody: true })
    await app.init()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    sender.sent = []
    sender.accepts = true
    gate.allowed = true
  })

  it('sends the code to the 11-digit phone when the signature is valid', async () => {
    await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200, {})
    expect(sender.sent).toHaveLength(1)
    expect(sender.sent[0]?.phone).toBe('67991230374')
    expect(sender.sent[0]?.message).toContain('123456')
  })

  it.each([
    ['no signature', {}],
    ['a wrong signature', { ...signed(PAYLOAD), 'webhook-signature': 'v1,AAAA' }],
    ['an old timestamp', signed(PAYLOAD, Math.floor(Date.now() / 1000) - 3600)],
  ])('refuses %s without sending anything', async (_name, headers) => {
    await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(headers).send(PAYLOAD).expect(401)
    expect(sender.sent).toHaveLength(0)
  })

  it('refuses a body that was altered after signing', async () => {
    const tampered = PAYLOAD.replace('5567991230374', '5511988887777')
    await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(tampered).expect(401)
  })

  it('reports a hook error when the provider fails', async () => {
    sender.accepts = false
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body).toEqual({ error: { http_code: 502, message: 'sms provider failed' } })
  })

  it('answers 429 and sends nothing when the phone hit its SMS limit', async () => {
    gate.allowed = false
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body).toEqual({ error: { http_code: 429, message: 'too many sms requests' } })
    expect(sender.sent).toHaveLength(0)
  })
})
