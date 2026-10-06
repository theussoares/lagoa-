import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouter } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { returnLocation, signInLocation } from '../app/composables/useCustomerSession'

const token = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v'

afterEach(() => {
  vi.restoreAllMocks()
  restoreClock()
})

describe('returnLocation', () => {
  it('sends the customer back to the check-in with the visit fragment', () => {
    expect(returnLocation('/check-in', `#visita=${token}`)).toBe(`/check-in#visita=${token}`)
  })

  it('drops a fragment that is not a valid visit token', () => {
    expect(returnLocation('/check-in', '#visita=curto')).toBe('/check-in')
    expect(returnLocation('/check-in', '#secao')).toBe('/check-in')
    expect(returnLocation('/check-in', '')).toBe('/check-in')
  })

  it('carries only the token: other fragment params never ride along', () => {
    expect(returnLocation('/check-in', `#x=1&visita=${token}&y=2`)).toBe(`/check-in#visita=${token}`)
  })

  it('keeps the visit fragment out of every other page', () => {
    expect(returnLocation('/carteira', `#visita=${token}`)).toBe('/carteira')
    expect(returnLocation(undefined, `#visita=${token}`)).toBe('/carteira')
  })

  it('still refuses a return path that leaves the app', () => {
    expect(returnLocation('//evil.example/check-in', `#visita=${token}`)).toBe('/carteira')
  })
})

describe('signInLocation', () => {
  it('never puts the token in ?para=: the path goes without the fragment and the fragment goes in the hash', () => {
    const location = signInLocation({ fullPath: `/check-in#visita=${token}`, hash: `#visita=${token}` })
    expect(location).toEqual({ path: '/entrar', query: { para: '/check-in' }, hash: `#visita=${token}` })
    expect(location.query.para).not.toContain(token)
  })

  it('keeps the token out of ?para= even when hash and fullPath are encoded differently', () => {
    const location = signInLocation({ fullPath: `/check-in#visita=${token}%20`, hash: `#visita=${token} ` })
    expect(location.query.para).toBe('/check-in')
    expect(JSON.stringify(location.query)).not.toContain(token)
  })

  it('drops a fragment sent in ?para= before building the return location', () => {
    expect(returnLocation(`/check-in#visita=${token}%20`, '')).toBe('/check-in')
  })

  it('keeps the query of the page in ?para=', () => {
    expect(signInLocation({ fullPath: '/check-in?loja=NAV4K7', hash: '' })).toEqual({ path: '/entrar', query: { para: '/check-in?loja=NAV4K7' } })
  })

  it('drops any other fragment and an invalid token', () => {
    expect(signInLocation({ fullPath: '/premios#topo', hash: '#topo' })).toEqual({ path: '/entrar', query: { para: '/premios' } })
    expect(signInLocation({ fullPath: '/check-in#visita=curto', hash: '#visita=curto' })).toEqual({
      path: '/entrar',
      query: { para: '/check-in' },
    })
  })

  it('has no ?para= for the home page', () => {
    expect(signInLocation({ fullPath: '/carteira', hash: '' })).toEqual({ path: '/entrar', query: {} })
  })
})

describe('customer-auth and customer-guest with the visit link', () => {
  beforeEach(async () => {
    await useRouter().replace('/entrar')
  })

  it('sends a signed-out customer to the sign-in with the fragment, and the token out of the query', async () => {
    resetWorld()
    const router = useRouter()
    await router.push(`/check-in#visita=${token}`)
    const route = router.currentRoute.value
    expect(route.path).toBe('/entrar')
    expect(route.query).toEqual({ para: '/check-in' })
    expect(route.hash).toBe(`#visita=${token}`)
    expect(JSON.stringify(route.query)).not.toContain(token)
  })

  it('brings a signed-in customer from the sign-in back to the check-in with the fragment', async () => {
    resetWorld({ customer: anaSession })
    const router = useRouter()
    await router.push(`/entrar?para=/check-in#visita=${token}`)
    const route = router.currentRoute.value
    expect(route.path).toBe('/check-in')
    expect(route.hash).toBe(`#visita=${token}`)
    expect(route.query).toEqual({})
  })
})
