import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable as mountHarness } from '#layers/core/test/composableHarness.nuxt'
import type { MountedComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { useWalletScreen } from '../app/composables/useWalletScreen'

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

describe('useWalletScreen', () => {
  it('signs out when the wallet says the session is no longer valid', async () => {
    vi.spyOn(useNuxtApp().$customerServices.wallet, 'listCards').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    const { result } = await mountComposable(useWalletScreen)
    await flushPromises()
    expect(result.cardsState.status).toBe('error')
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('shows the cards, with the first one open until the person opens or closes one', async () => {
    const { result } = await mountComposable(useWalletScreen)
    expect(result.cards.length).toBeGreaterThan(0)
    expect(result.expandedId).toBe(result.cards[0]?.id)
    const other = result.cards[1]
    if (other) {
      result.toggleCard(other.id)
      expect(result.expandedId).toBe(other.id)
      result.toggleCard(other.id)
      expect(result.expandedId).toBe('')
    }
  })

  it('narrows the list by tab and by search, without accent or case, and counts each tab', async () => {
    const { result } = await mountComposable(useWalletScreen)
    const total = result.cards.length
    expect(result.filterCounts.all).toBe(total)
    expect(result.filterCounts.ready + result.filterCounts.progress).toBe(total)
    result.filter = 'ready'
    expect(result.visibleCards).toHaveLength(result.filterCounts.ready)
    result.filter = 'all'
    const first = result.cards[0]
    if (first === undefined) throw new Error('a card was expected')
    result.query = first.shopName.toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    expect(result.visibleCards.map((card) => card.id)).toContain(first.id)
    result.query = 'zzzz-sem-loja'
    expect(result.visibleCards).toHaveLength(0)
    expect(result.expandedId).toBe('')
  })

  it('greets by first name once the profile is there', async () => {
    const { result } = await mountComposable(useWalletScreen)
    await vi.waitFor(() => expect(result.greeting).toMatch(/^Olá, /))
  })

  it('remembers on this device the balances it has just shown', async () => {
    const { result } = await mountComposable(useWalletScreen)
    await vi.waitFor(() => expect(window.localStorage.getItem('lagoa:seen-balances')).not.toBeNull())
    const saved = JSON.parse(window.localStorage.getItem('lagoa:seen-balances') ?? '{}') as Record<string, number>
    expect(Object.keys(saved)).toEqual(expect.arrayContaining(result.cards.map((card) => card.id)))
  })

  it('lists the recent activity once it has loaded', async () => {
    const { result } = await mountComposable(useWalletScreen)
    await vi.waitFor(() => expect(result.ledger.length).toBeGreaterThan(0))
  })
})
