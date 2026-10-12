import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { useWalletScreen } from '../app/composables/useWalletScreen'

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))
mockNuxtImport('useCustomerSession', () => () => ({ signOut: signOutMock }))

beforeEach(() => {
  resetWorld({ customer: anaSession })
  // O dado do Nuxt é por chave e guarda o carregador da primeira montagem: cada teste começa sem ele.
  clearNuxtData()
  signOutMock.mockReset()
})

afterEach(() => {
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

  it('shows the cards, with the first one active until another is chosen', async () => {
    const { result } = await mountComposable(useWalletScreen)
    expect(result.cards.length).toBeGreaterThan(0)
    expect(result.activeId).toBe(result.cards[0]?.id)
    const other = result.cards[1]
    if (other) {
      result.activeId = other.id
      expect(result.activeId).toBe(other.id)
    }
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
