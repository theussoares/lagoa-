import { describe, expect, it } from 'vitest'
import { visitQrLink, checkInLink } from '#shared/utils/checkInCode'
import type { CheckInCode } from '#shared/schemas/shop'
import type { VisitToken } from '#shared/schemas/visitQr'
import { hasVisitFragment, linkIntent, toCheckInIntent } from '../app/utils/checkInInput'

const token = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v' as VisitToken
const shopCode = 'NAV4K7'
const visitCode = 'K7M3P'

describe('hasVisitFragment', () => {
  it.each([
    ['#visita=abc', true],
    ['visita=abc', true],
    [`#visita=${token}`, true],
    ['#secao', false],
    ['', false],
    ['#outra=visita=1', false],
  ])('%s -> %s', (hash, expected) => {
    expect(hasVisitFragment(hash)).toBe(expected)
  })
})

describe('linkIntent', () => {
  it('is null when the page was opened without a QR', () => {
    expect(linkIntent({}, '')).toBeNull()
    expect(linkIntent({ outra: 'x' }, '#secao')).toBeNull()
  })

  it('claims with the token from the visit fragment', () => {
    expect(linkIntent({}, `#visita=${token}`)).toEqual({ ok: true, value: { kind: 'claim', credential: { kind: 'token', token } } })
  })

  it('reads the fragment of a real visit QR link', () => {
    const { hash } = new URL(visitQrLink('https://app.example', token))
    expect(linkIntent({}, hash)).toMatchObject({ ok: true, value: { kind: 'claim' } })
  })

  it('refuses a malformed token instead of ignoring the link', () => {
    expect(linkIntent({}, '#visita=curto')).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
  })

  it('never takes the token from the query (P-19)', () => {
    expect(linkIntent({ visita: token }, '')).toBeNull()
  })

  it('joins the club with the poster code from ?loja=', () => {
    expect(linkIntent({ loja: shopCode }, '')).toEqual({ ok: true, value: { kind: 'join', code: shopCode } })
    const query = Object.fromEntries(new URL(checkInLink('https://app.example', shopCode as CheckInCode)).searchParams)
    expect(linkIntent(query, '')).toMatchObject({ ok: true, value: { kind: 'join' } })
  })

  it('refuses a malformed poster code', () => {
    expect(linkIntent({ loja: 'x' }, '')).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })

  it('prefers the visit fragment over the poster code', () => {
    expect(linkIntent({ loja: shopCode }, `#visita=${token}`)).toMatchObject({ ok: true, value: { kind: 'claim' } })
  })
})

describe('toCheckInIntent: typed', () => {
  it('claims with the short visit code, normalized, in the visit mode', () => {
    expect(toCheckInIntent(' k7 m3p ', 'typed', 'visit')).toEqual({
      ok: true,
      value: { kind: 'claim', credential: { kind: 'visitCode', code: visitCode } },
    })
  })

  it('joins with the shop code in the shop mode', () => {
    expect(toCheckInIntent('nav 4k7', 'typed', 'shop')).toEqual({ ok: true, value: { kind: 'join', code: shopCode } })
  })

  it('tells the mode by the code length: a shop code is not a visit code and the other way round', () => {
    expect(toCheckInIntent(shopCode, 'typed', 'visit')).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    expect(toCheckInIntent(visitCode, 'typed', 'shop')).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })
})

describe('toCheckInIntent: camera and link', () => {
  it('joins with the poster QR', () => {
    expect(toCheckInIntent(checkInLink('https://app.example', shopCode as CheckInCode), 'camera', 'visit')).toEqual({
      ok: true,
      value: { kind: 'join', code: shopCode },
    })
  })

  it('claims with the visit QR, whatever the typing mode', () => {
    expect(toCheckInIntent(visitQrLink('https://app.example', token), 'camera', 'shop')).toEqual({
      ok: true,
      value: { kind: 'claim', credential: { kind: 'token', token } },
    })
  })

  it('refuses a visit QR sent in the query and anything that is not a Lagoa+ QR', () => {
    expect(toCheckInIntent(`https://app.example/check-in?visita=${token}`, 'camera', 'visit')).toEqual({
      ok: false,
      error: { code: 'invalidShopQr' },
    })
    expect(toCheckInIntent('lixo', 'camera', 'visit').ok).toBe(false)
  })
})
