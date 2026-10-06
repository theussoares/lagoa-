import { describe, expect, it } from 'vitest'
import { CheckInCodeSchema } from '../schemas/shop'
import { VisitTokenSchema } from '../schemas/visitQr'
import {
  checkInLink,
  parseCheckInCode,
  parseVisitCode,
  parseVisitToken,
  readScannedQr,
  readVisitFragment,
  visitQrLink,
} from './checkInCode'

const TOKEN = 'Ab3_-xYz0123456789Ab3_-xYz0123456789Ab3_-xY'
const VISIT_QR_LINK = /^https?:\/\/[^?#]+\/check-in#visita=[A-Za-z0-9_-]{43}$/
const SHOP_QR_LINK = /^https?:\/\/[^?#]+\/check-in\?loja=[A-Za-z0-9_-]+$/
/** Nada que pareça celular (8+ dígitos seguidos), e-mail, uuid ou valor em reais. */
const PERSONAL_DATA = /\d{8,}|@|[0-9a-f]{8}-[0-9a-f]{4}-|R\$|amount|cents/i

describe('parseCheckInCode', () => {
  it('normalizes case and spacing typed by the customer', () => {
    const result = parseCheckInCode(' nav 4k7 ')
    expect(result.ok && result.value).toBe('NAV4K7')
  })

  it.each(['NAV4K', 'NAV4K7X', 'NAV0K7', 'NAVIK7', ''])('rejects %j', (input) => {
    expect(parseCheckInCode(input)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })
})

describe('parseVisitCode', () => {
  it('normalizes the short code typed by the customer', () => {
    const result = parseVisitCode(' k7 m3p ')
    expect(result.ok && result.value).toBe('K7M3P')
  })

  it.each(['K7M3', 'K7M3PX', 'NAV4K7', 'K7M0P', ''])('rejects %j', (input) => {
    expect(parseVisitCode(input)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })
})

describe('parseVisitToken', () => {
  it('accepts a 43-character base64url token', () => {
    expect(parseVisitToken(TOKEN)).toEqual({ ok: true, value: TOKEN })
  })

  it.each([TOKEN.slice(1), `${TOKEN}A`, `${TOKEN.slice(1)}=`, `${TOKEN.slice(1)}+`, ''])('rejects %j', (input) => {
    expect(parseVisitToken(input)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })
})

describe('readVisitFragment', () => {
  it('reads the token with or without the hash sign', () => {
    expect(readVisitFragment(`#visita=${TOKEN}`)).toBe(TOKEN)
    expect(readVisitFragment(`visita=${TOKEN}`)).toBe(TOKEN)
  })

  it.each(['', '#', '#top', '#visita=', '#visita=abc', `#loja=${TOKEN}`])('is null for %j', (hash) => {
    expect(readVisitFragment(hash)).toBeNull()
  })
})

describe('readScannedQr', () => {
  it('reads the shop code from the poster link on any host', () => {
    expect(readScannedQr('https://exemplo.app/check-in?loja=nav4k7')).toEqual({ ok: true, value: { kind: 'shop', code: 'NAV4K7' } })
  })

  it('accepts a bare shop code', () => {
    expect(readScannedQr('NAV4K7')).toEqual({ ok: true, value: { kind: 'shop', code: 'NAV4K7' } })
  })

  it('reads the visit token from the fragment', () => {
    expect(readScannedQr(`https://exemplo.app/check-in#visita=${TOKEN}`)).toEqual({ ok: true, value: { kind: 'visit', token: TOKEN } })
  })

  it('refuses a malformed visit fragment as a visit QR', () => {
    expect(readScannedQr('https://exemplo.app/check-in#visita=abc')).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })

  it('never accepts the token in the query', () => {
    expect(readScannedQr(`https://exemplo.app/check-in?visita=${TOKEN}`)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })

  it.each(['https://exemplo.app/check-in', 'https://exemplo.app/?loja=xx', 'WIFI:S:loja;T:WPA;P:123;;', 'mailto:a@b.c'])(
    'rejects %s',
    (content) => {
      expect(readScannedQr(content).ok).toBe(false)
    },
  )
})

describe('QR links (CA-25)', () => {
  it('builds the poster link that the scanner reads back', () => {
    const code = CheckInCodeSchema.parse('NAV4K7')
    const link = checkInLink('https://lagoa.test', code)
    expect(link).toBe('https://lagoa.test/check-in?loja=NAV4K7')
    expect(link).toMatch(SHOP_QR_LINK)
    expect(link).not.toMatch(PERSONAL_DATA)
    expect(readScannedQr(link)).toEqual({ ok: true, value: { kind: 'shop', code } })
  })

  it('builds the visit link with the token only in the fragment', () => {
    const token = VisitTokenSchema.parse(TOKEN)
    const link = visitQrLink('https://lagoa.test', token)
    expect(link).toBe(`https://lagoa.test/check-in#visita=${TOKEN}`)
    expect(link).toMatch(VISIT_QR_LINK)
    expect(new URL(link).search).toBe('')
    expect(readScannedQr(link)).toEqual({ ok: true, value: { kind: 'visit', token } })
  })

  it('carries no personal data in random visit links', () => {
    for (let index = 0; index < 50; index += 1) {
      const bytes = crypto.getRandomValues(new Uint8Array(32))
      const raw = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const link = visitQrLink('https://lagoa.test', VisitTokenSchema.parse(raw))
      expect(link).toMatch(VISIT_QR_LINK)
      expect(link.replace(raw, '')).not.toMatch(PERSONAL_DATA)
    }
  })
})
