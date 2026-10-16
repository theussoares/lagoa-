import { describe, expect, it } from 'vitest'
import { canonicalShopCtaUrl, isPublicHttpsUrl, normalizeShopCtaUrl } from './shopCtaUrl'

describe('normalizeShopCtaUrl', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(normalizeShopCtaUrl('www.loja.com')).toBe('https://www.loja.com')
    expect(normalizeShopCtaUrl('loja.com/x')).toBe('https://loja.com/x')
  })
  it('trims spaces and keeps an existing scheme, case-insensitively', () => {
    expect(normalizeShopCtaUrl('  HTTPS://loja.com/a  ')).toBe('HTTPS://loja.com/a')
    expect(normalizeShopCtaUrl('http://loja.com')).toBe('http://loja.com')
  })
})

describe('isPublicHttpsUrl', () => {
  it.each(['https://loja.com', 'https://www.loja.com.br/cardapio?a=1#x', 'HTTPS://Loja.com'])('accepts %s', (url) => {
    expect(isPublicHttpsUrl(url)).toBe(true)
  })
  it.each([
    'http://loja.com',
    'javascript:alert(1)',
    'data:text/html,hi',
    'https://user:pass@loja.com',
    'https://user@loja.com',
    'https://localhost/x',
    'https://intranet',
    'https://127.0.0.1',
    'https://10.0.0.1/x',
    'https://[::1]/x',
    'https://loja.com/a b',
    'https://.com',
    'https://a..b.com',
    'https://*.com',
    'https://loja.com:8443',
    'https://loja.com:0',
    'not a url',
    '',
    `https://loja.com/${'a'.repeat(500)}`,
  ])('refuses %s', (url) => {
    expect(isPublicHttpsUrl(url)).toBe(false)
  })
})

describe('canonicalShopCtaUrl', () => {
  it.each([
    ['HTTPS://Loja.com', 'https://loja.com/'],
    ['Https://loja.com/Cardapio?A=1', 'https://loja.com/Cardapio?A=1'],
    ['https:loja.com', 'https://loja.com/'],
    ['https:\\\\loja.com\\x', 'https://loja.com/x'],
    ['  www.loja.com ', 'https://www.loja.com/'],
    ['https://lojá.com', 'https://xn--loj-gla.com/'],
  ])('turns %j into %j, which the database check accepts', (input, expected) => {
    expect(canonicalShopCtaUrl(input)).toBe(expected)
  })
  it('is null for what is not a public https url', () => {
    expect(canonicalShopCtaUrl('http://loja.com')).toBeNull()
    expect(canonicalShopCtaUrl('https://localhost')).toBeNull()
    expect(canonicalShopCtaUrl('https://127.0.0.1')).toBeNull()
    expect(canonicalShopCtaUrl('')).toBeNull()
  })
  it('never lets a NUL byte reach the database', () => {
    expect(canonicalShopCtaUrl('https://loja.com/\u0000')).not.toContain('\u0000')
  })
})
