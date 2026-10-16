import { describe, expect, it } from 'vitest'
import { isPublicHttpsUrl, normalizeShopCtaUrl } from './shopCtaUrl'

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
    'not a url',
    '',
    `https://loja.com/${'a'.repeat(500)}`,
  ])('refuses %s', (url) => {
    expect(isPublicHttpsUrl(url)).toBe(false)
  })
})
