import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable as mountHarness } from '#layers/core/test/composableHarness.nuxt'
import type { MountedComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { useDiscoverScreen } from '../app/composables/useDiscoverScreen'

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))
mockNuxtImport('useCustomerSession', () => () => ({ signOut: signOutMock }))

const mounted: Array<{ unmount: () => void }> = []

/** O Nuxt guarda o carregador da primeira montagem por chave: desmontar ao fim de cada teste evita espiões em serviços velhos. */
async function mountComposable<T>(factory: () => T, options: { route?: string } = {}): Promise<MountedComposable<T>> {
  const result = await mountHarness(factory, options)
  mounted.push(result.wrapper)
  return result
}

beforeEach(() => {
  resetWorld({ customer: anaSession })
  // O dado do Nuxt é por chave e guarda o carregador da primeira montagem: cada teste começa sem ele.
  clearNuxtData()
  signOutMock.mockReset()
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  clearNuxtData()
  vi.restoreAllMocks()
  restoreClock()
})

function services(): ReturnType<typeof useNuxtApp>['$customerServices'] {
  return useNuxtApp().$customerServices
}

describe('useDiscoverScreen', () => {
  it('signs out when any of the three sources says the session is no longer valid', async () => {
    vi.spyOn(services().discover, 'listShops').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    const { result } = await mountComposable(useDiscoverScreen)
    await flushPromises()
    expect(result.shopsState.status).toBe('error')
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('splits the shops by whether the wallet already has a card there', async () => {
    const cards = await services().wallet.listCards()
    const walletShops = new Set<string>(cards.ok ? cards.value.map((card) => card.shopId) : [])
    const { result } = await mountComposable(useDiscoverScreen)
    await vi.waitFor(() => expect(result.loading).toBe(false))
    expect(result.known.length).toBe(walletShops.size)
    expect(result.known.every((shop) => walletShops.has(shop.id))).toBe(true)
    expect(result.fresh.every((shop) => !walletShops.has(shop.id))).toBe(true)
    expect(result.fresh.length).toBeGreaterThan(0)
  })

  it('searches the shops and ignores a blank query', async () => {
    const { result } = await mountComposable(useDiscoverScreen)
    await vi.waitFor(() => expect(result.loading).toBe(false))
    const all = result.fresh.length + result.known.length
    result.query = '   '
    expect(result.searching).toBe(false)
    expect(result.fresh.length + result.known.length).toBe(all)
    result.query = 'zzzz-nenhuma-loja'
    expect(result.searching).toBe(true)
    expect(result.fresh).toHaveLength(0)
    expect(result.known).toHaveLength(0)
  })

  it('makes the first challenge in progress the hero and keeps the others as cards', async () => {
    const { result } = await mountComposable(useDiscoverScreen)
    await vi.waitFor(() => expect(result.loading).toBe(false))
    const hero = result.heroChallenge
    expect(hero?.done).toBe(false)
    expect(result.otherChallenges.some((challenge) => challenge.id === hero?.id)).toBe(false)
  })
})
