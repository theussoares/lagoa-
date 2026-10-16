import { createHmac } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PhoneNumber } from '#shared/schemas/phone'
import { ENV } from '../../config/config.module'
import { OtpChannelChoice } from './otp-channel-choice'
import { OtpSendGate } from './otp-send-gate'
import { OtpSender, type OtpSendResult } from './otp-sender'
import { OtpSenders } from './otp-senders'
import { SendSmsHookController } from './send-sms-hook.controller'
import type { OtpChannel } from '#shared/schemas/session'

const KEY = Buffer.from('hook-test-secret-hook-test-secret')
const SECRET = `v1,whsec_${KEY.toString('base64')}`

class RecordingOtpSender extends OtpSender {
  sent: Array<{ phone: PhoneNumber; code: string }> = []
  result: OtpSendResult = 'sent'
  async send(phone: PhoneNumber, code: string): Promise<OtpSendResult> {
    this.sent.push({ phone, code })
    return this.result
  }
}

function signed(body: string, at = Math.floor(Date.now() / 1000)): Record<string, string> {
  const signature = createHmac('sha256', KEY).update(`msg_1.${at}.${body}`).digest('base64')
  return { 'content-type': 'application/json', 'webhook-id': 'msg_1', 'webhook-timestamp': String(at), 'webhook-signature': `v1,${signature}` }
}

const PAYLOAD = JSON.stringify({ user: { phone: '5567991230374' }, sms: { otp: '123456' } })

class ScriptedGate {
  allowed = true
  calls = 0
  async allow(): Promise<boolean> {
    this.calls += 1
    return this.allowed
  }
}

class ScriptedChannels {
  channel: OtpChannel = 'whatsapp'
  fails = false
  async current(): Promise<OtpChannel> {
    if (this.fails) throw new Error('db down')
    return this.channel
  }
}

describe('Send SMS hook', () => {
  let app: INestApplication
  const sender = new RecordingOtpSender()
  const sms = new RecordingOtpSender()
  const gate = new ScriptedGate()
  const channels = new ScriptedChannels()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SendSmsHookController],
      providers: [
        { provide: ENV, useValue: { SEND_SMS_HOOK_SECRET: SECRET } },
        { provide: OtpSenders, useValue: { for: (channel: OtpChannel) => (channel === 'sms' ? sms : sender) } },
        { provide: OtpChannelChoice, useValue: channels },
        { provide: OtpSendGate, useValue: gate },
      ],
    }).compile()
    app = moduleRef.createNestApplication({ rawBody: true })
    await app.init()
  })
  afterAll(() => app.close())
  beforeEach(() => {
    sender.sent = []
    sender.result = 'sent'
    sms.sent = []
    sms.result = 'sent'
    gate.allowed = true
    gate.calls = 0
    channels.channel = 'whatsapp'
    channels.fails = false
  })

  it('sends the code to the 11-digit phone when the signature is valid', async () => {
    await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200, {})
    expect(sender.sent).toHaveLength(1)
    expect(sender.sent[0]?.phone).toBe('67991230374')
    expect(sender.sent[0]?.code).toBe('123456')
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
    sender.result = 'failed'
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body).toEqual({ error: { http_code: 502, message: 'code provider failed' } })
  })

  it('reports 429 when the provider throttles the recipient', async () => {
    sender.result = 'throttled'
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body).toEqual({ error: { http_code: 429, message: 'too many code requests' } })
  })

  it('answers 429 and sends nothing when the phone hit its limit', async () => {
    gate.allowed = false
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body).toEqual({ error: { http_code: 429, message: 'too many code requests' } })
    expect(sender.sent).toHaveLength(0)
  })

  it('delivers by SMS only when the person chose SMS', async () => {
    channels.channel = 'sms'
    await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200, {})
    expect(sms.sent).toHaveLength(1)
    expect(sms.sent[0]?.code).toBe('123456')
    expect(sender.sent).toHaveLength(0)
  })

  it.each([
    ['whatsapp', 'throttled'],
    ['whatsapp', 'failed'],
    ['sms', 'failed'],
  ] as const)('never falls back to the other channel when %s answers %s', async (channel, result) => {
    channels.channel = channel
    const chosen = channel === 'sms' ? sms : sender
    const other = channel === 'sms' ? sender : sms
    chosen.result = result
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body.error.http_code).toBe(result === 'throttled' ? 429 : 502)
    expect(chosen.sent).toHaveLength(1)
    expect(other.sent).toHaveLength(0)
  })

  it('runs both channels through the same send gate', async () => {
    for (const channel of ['whatsapp', 'sms'] as const) {
      channels.channel = channel
      await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    }
    expect(gate.calls).toBe(2)
  })

  it('answers 502 without sending or consuming the limit when the channel cannot be read', async () => {
    channels.fails = true
    const response = await request(app.getHttpServer()).post('/auth/hooks/send-sms').set(signed(PAYLOAD)).send(PAYLOAD).expect(200)
    expect(response.body).toEqual({ error: { http_code: 502, message: 'code provider failed' } })
    expect(sender.sent).toHaveLength(0)
    expect(sms.sent).toHaveLength(0)
    expect(gate.calls).toBe(0)
  })
})
