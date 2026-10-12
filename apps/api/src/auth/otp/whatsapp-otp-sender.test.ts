import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { WhatsAppOtpSender } from './whatsapp-otp-sender'

const PHONE = PhoneNumberSchema.parse('67991230374')
const CODE = '123456'

const validEnv = {
  WHATSAPP_ACCESS_TOKEN: 'test-token',
  WHATSAPP_PHONE_NUMBER_ID: '987654321',
  WHATSAPP_TEMPLATE_NAME: 'lagoa_login_code',
  WHATSAPP_TEMPLATE_LANGUAGE: 'pt_BR',
  WHATSAPP_GRAPH_VERSION: 'v23.0',
}

function respond(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

describe('WhatsAppOtpSender', () => {
  let logs: string[] = []

  beforeEach(() => {
    logs = []
    for (const level of ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logs.push(String(message))
      })
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the correct URL, headers, and template payload with the code in body and button', async () => {
    const sender = new WhatsAppOtpSender(validEnv)
    const spy = respond(200, {
      messaging_product: 'whatsapp',
      contacts: [{ input: '5567991230374', wa_id: '556791230374' }],
      messages: [{ id: 'wamid.HBgM...', message_status: 'accepted' }],
    })

    const result = await sender.send(PHONE, CODE)
    expect(result).toBe('sent')

    const [url, init] = spy.mock.calls[0] ?? []
    expect(url).toBe('https://graph.facebook.com/v23.0/987654321/messages')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    })

    const body = JSON.parse(String(init?.body))
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5567991230374',
      type: 'template',
      template: {
        name: 'lagoa_login_code',
        language: { code: 'pt_BR' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] },
        ],
      },
    })
  })

  it('reports throttled when Meta returns error 131056', async () => {
    const sender = new WhatsAppOtpSender(validEnv)
    respond(400, {
      error: {
        message: 'Too many messages sent',
        type: 'OAuthException',
        code: 131056,
        fbtrace_id: 'trace-429',
      },
    })

    const result = await sender.send(PHONE, CODE)
    expect(result).toBe('throttled')
    expect(logs.some((l) => l.includes('code=131056') && l.includes('fbtraceId=trace-429'))).toBe(true)
  })

  it('logs critical errors at error level for authentication and template failures', async () => {
    const sender = new WhatsAppOtpSender(validEnv)
    const errorSpy = vi.spyOn(Logger.prototype, 'error')

    respond(401, {
      error: {
        message: 'Invalid OAuth access token',
        type: 'OAuthException',
        code: 190,
        fbtrace_id: 'trace-auth',
      },
    })

    const result = await sender.send(PHONE, CODE)
    expect(result).toBe('failed')
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('code=190'))
  })

  it('logs non-critical errors at warn level (e.g. 131026 undecryptable/undeliverable)', async () => {
    const sender = new WhatsAppOtpSender(validEnv)
    const warnSpy = vi.spyOn(Logger.prototype, 'warn')

    respond(400, {
      error: {
        message: 'Undeliverable message',
        type: 'OAuthException',
        code: 131026,
        fbtrace_id: 'trace-undeliverable',
      },
    })

    const result = await sender.send(PHONE, CODE)
    expect(result).toBe('failed')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('code=131026'))
  })

  it('reports failed when 200 OK has no message ID or invalid body', async () => {
    const sender = new WhatsAppOtpSender(validEnv)
    respond(200, { messages: [] })

    expect(await sender.send(PHONE, CODE)).toBe('failed')
  })

  it('reports failed when network or timeout rejects the fetch request', async () => {
    const sender = new WhatsAppOtpSender(validEnv)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'))

    expect(await sender.send(PHONE, CODE)).toBe('failed')
    expect(logs.some((l) => l.includes('otp.whatsapp.unreachable'))).toBe(true)
  })

  it('reports failed without calling fetch if token or phone number id is missing', async () => {
    const sender = new WhatsAppOtpSender({
      ...validEnv,
      WHATSAPP_ACCESS_TOKEN: undefined,
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    expect(await sender.send(PHONE, CODE)).toBe('failed')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(logs.some((l) => l.includes('otp.whatsapp.notConfigured'))).toBe(true)
  })

  it('never leaks the phone number or code in logs across success, errors and timeouts', async () => {
    const sender = new WhatsAppOtpSender(validEnv)

    // 1. Success
    respond(200, { messages: [{ id: 'wamid.123' }] })
    await sender.send(PHONE, CODE)

    // 2. Error response
    respond(400, { error: { code: 131026, type: 'OAuthException', fbtrace_id: 'xyz' } })
    await sender.send(PHONE, CODE)

    // 3. Exception
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network failure'))
    await sender.send(PHONE, CODE)

    const allLogs = logs.join('\n')
    expect(allLogs).not.toContain('67991230374')
    expect(allLogs).not.toContain('123456')
  })
})
