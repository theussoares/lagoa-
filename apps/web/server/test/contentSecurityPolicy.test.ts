import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  addNonce,
  BASE_CSP,
  createNonce,
  hashContentSecurityPolicyMeta,
  nonceContentSecurityPolicy,
} from '../utils/contentSecurityPolicy'

const sha256 = (body: string): string => `'sha256-${createHash('sha256').update(body).digest('base64')}'`

describe('createNonce', () => {
  it('draws 128 random bits per response', () => {
    const nonce = createNonce()
    expect(Buffer.from(nonce, 'base64')).toHaveLength(16)
    expect(createNonce()).not.toBe(nonce)
  })
})

describe('nonceContentSecurityPolicy', () => {
  it('keeps the fixed directives and allows only scripts carrying the nonce (and what they load)', () => {
    const policy = nonceContentSecurityPolicy('abc')
    expect(policy.startsWith(BASE_CSP)).toBe(true)
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(policy).not.toContain('unsafe-inline')
    expect(policy).not.toContain('unsafe-eval')
  })

  it('lets the QR reader start its blob worker', () => {
    expect(nonceContentSecurityPolicy('abc')).toContain("worker-src 'self' blob:")
  })
})

describe('addNonce', () => {
  it('tags every script and script preload the renderer wrote', () => {
    const html = [
      '<link rel="modulepreload" crossorigin href="/_nuxt/a.js">',
      '<link rel="stylesheet" href="/_nuxt/a.css">',
      '<script type="module" src="/_nuxt/entry.js" crossorigin></script>',
      '<script>window.__NUXT__={}</script>',
      '<script type="application/json" id="__NUXT_DATA__">[]</script>',
    ].join('')
    const tagged = addNonce(html, 'abc')
    expect(tagged.match(/<script nonce="abc"/g)).toHaveLength(3)
    expect(tagged).toContain('<link nonce="abc" rel="modulepreload"')
    expect(tagged).toContain('<link rel="stylesheet"')
  })

  it('never doubles a nonce that is already there', () => {
    expect(addNonce('<script nonce="old">x</script>', 'abc')).toBe('<script nonce="old">x</script>')
  })
})

describe('hashContentSecurityPolicyMeta', () => {
  it('hashes every inline script (the import map too) and leaves external ones to self', () => {
    const meta = hashContentSecurityPolicyMeta(
      [
        '<script type="importmap">{"imports":{}}</script>',
        '<script>window.__NUXT__={}</script>',
        '<script type="module" src="/_nuxt/entry.js"></script>',
      ].join(''),
    )
    expect(meta).toBe(
      `<meta http-equiv="Content-Security-Policy" content="script-src 'self' ${sha256('{"imports":{}}')} ${sha256('window.__NUXT__={}')}; worker-src 'self' blob:">`,
    )
  })
})
