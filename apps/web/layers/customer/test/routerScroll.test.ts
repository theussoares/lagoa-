import { describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import type { RouterScrollBehavior } from '../app/types/routerScroll'
import { withoutVisitFragment } from '../app/utils/visitScroll'

const token = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v'

function route(path: string, hash = ''): RouteLocationNormalized {
  return { path, hash, fullPath: `${path}${hash}`, query: {}, params: {}, matched: [], meta: {}, name: undefined, redirectedFrom: undefined }
}

function setup() {
  const fallback = vi.fn<RouterScrollBehavior>(() => ({ left: 0, top: 0 }))
  const behavior = withoutVisitFragment(fallback)
  return { fallback, behavior }
}

describe('withoutVisitFragment', () => {
  it('delegates to the Nuxt default untouched when there is no visit fragment', () => {
    const { fallback, behavior } = setup()
    const to = route('/ajuda', '#privacidade')
    const from = route('/carteira')
    behavior(to, from, null)
    expect(fallback).toHaveBeenCalledWith(to, from, null)
  })

  it('hands the default a route without the visit fragment, so it is never an element id', () => {
    const { fallback, behavior } = setup()
    behavior(route('/check-in', `#visita=${token}`), route('/entrar'), null)
    expect(fallback.mock.calls[0]?.[0]).toMatchObject({ path: '/check-in', hash: '', fullPath: '/check-in' })
  })

  it('also cleans the origin route, so clearing the fragment on the same page does not scroll to the top', () => {
    const { fallback, behavior } = setup()
    behavior(route('/check-in'), route('/check-in', `#visita=${token}`), null)
    expect(fallback.mock.calls[0]?.[1].hash).toBe('')
  })

  it('passes the saved position through', () => {
    const { fallback, behavior } = setup()
    const saved = { left: 0, top: 120 }
    behavior(route('/check-in', `#visita=${token}`), route('/entrar'), saved)
    expect(fallback.mock.calls[0]?.[2]).toBe(saved)
  })
})
