import { describe, expect, it } from 'vitest'
import { surfaceRedirect } from '../utils/surfaceRedirect'

const hosts = { customerUrl: 'https://app.lagoa.test', merchantUrl: 'https://balcao.lagoa.test' }
const get = (host: string, pathAndQuery: string) => surfaceRedirect(hosts, { method: 'GET', host, pathAndQuery })

describe('surfaceRedirect', () => {
  it('sends the Balcão root to the counter', () => {
    expect(get('balcao.lagoa.test', '/')).toBe('https://balcao.lagoa.test/balcao')
  })

  it('moves customer pages opened on the Balcão host to the app host, keeping the query', () => {
    expect(get('balcao.lagoa.test', '/check-in?x=1')).toBe('https://app.lagoa.test/check-in?x=1')
    expect(get('balcao.lagoa.test', '/premios/abc')).toBe('https://app.lagoa.test/premios/abc')
  })

  it('moves merchant pages opened on the app host to the Balcão host', () => {
    expect(get('app.lagoa.test', '/balcao/entrar')).toBe('https://balcao.lagoa.test/balcao/entrar')
    expect(get('app.lagoa.test', '/painel')).toBe('https://balcao.lagoa.test/painel')
    expect(get('app.lagoa.test', '/botao-do-card')).toBe('https://balcao.lagoa.test/botao-do-card')
  })

  it('leaves each host alone on its own pages, API and assets', () => {
    expect(get('app.lagoa.test', '/carteira')).toBeNull()
    expect(get('app.lagoa.test', '/api/session')).toBeNull()
    expect(get('balcao.lagoa.test', '/painel')).toBeNull()
    expect(get('balcao.lagoa.test', '/_nuxt/entry.js')).toBeNull()
  })

  it('does not match a path that only shares a prefix', () => {
    expect(get('app.lagoa.test', '/balcaozinho')).toBeNull()
  })

  it('does nothing for writes, unknown hosts or when the split is off', () => {
    expect(surfaceRedirect(hosts, { method: 'POST', host: 'app.lagoa.test', pathAndQuery: '/painel' })).toBeNull()
    expect(get('preview.vercel.app', '/painel')).toBeNull()
    expect(surfaceRedirect({ customerUrl: '', merchantUrl: '' }, { method: 'GET', host: 'app.lagoa.test', pathAndQuery: '/painel' })).toBeNull()
  })
})
