import { describe, expect, it } from 'vitest'
import { parseCheckInCode, readCheckInQr } from './checkInCode'

describe('parseCheckInCode', () => {
  it('normalizes case and spacing typed by the customer', () => {
    const result = parseCheckInCode(' nav 4k7 ')
    expect(result.ok && result.value).toBe('NAV4K7')
  })

  it.each(['NAV4K', 'NAV4K7X', 'NAV0K7', 'NAVIK7', ''])('rejects %j', (input) => {
    expect(parseCheckInCode(input)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
  })
})

describe('readCheckInQr', () => {
  it('reads the code from the shop link on any host', () => {
    const result = readCheckInQr('https://exemplo.app/check-in?loja=nav4k7')
    expect(result.ok && result.value).toBe('NAV4K7')
  })

  it('accepts a bare code', () => {
    const result = readCheckInQr('NAV4K7')
    expect(result.ok && result.value).toBe('NAV4K7')
  })

  it.each(['https://exemplo.app/check-in', 'https://exemplo.app/?loja=xx', 'WIFI:S:loja;T:WPA;P:123;;', 'mailto:a@b.c'])(
    'rejects %s',
    (content) => {
      expect(readCheckInQr(content).ok).toBe(false)
    },
  )
})
