import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import { groupRewards } from '../app/utils/rewardsModel'
import { useRewardRedemptionScreen } from '../app/composables/useRewardRedemptionScreen'
import { useRewardsScreen } from '../app/composables/useRewardsScreen'

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }))
// `restore` é o que o middleware da rota do Resgate pergunta antes de abrir a tela.
mockNuxtImport('useCustomerSession', () => () => ({ signOut: signOutMock, restore: async () => ({ role: 'customer' }) }))

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

function services(): ReturnType<typeof useNuxtApp>['$customerServices'] {
  return useNuxtApp().$customerServices
}

describe('useRewardsScreen', () => {
  it('signs out when the cards say the session is no longer valid', async () => {
    vi.spyOn(services().wallet, 'listCards').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    const { result } = await mountComposable(useRewardsScreen)
    await flushPromises()
    expect(result.cardsState.status).toBe('error')
    expect(result.hasCards).toBe(false)
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('splits the cards into ready and upcoming rewards', async () => {
    const { result } = await mountComposable(useRewardsScreen)
    await vi.waitFor(() => expect(result.hasCards).toBe(true))
    expect(result.ready.length + result.upcoming.length).toBeGreaterThan(0)
    expect(result.closest === null).toBe(result.upcoming.length === 0)
  })

  it('lists the redeemed rewards once the history has loaded', async () => {
    const { result } = await mountComposable(useRewardsScreen)
    await vi.waitFor(() => expect(result.historyState.status).toBe('success'))
    expect(Array.isArray(result.history)).toBe(true)
  })
})

describe('useRewardRedemptionScreen', () => {
  async function readyCardId(): Promise<string> {
    const cards = await services().wallet.listCards()
    const card = cards.ok ? groupRewards(cards.value).ready[0] : undefined
    if (!card) throw new Error('the example seed has no card with a ready reward')
    return card.id
  }

  it('signs out when asking for the code says the session is no longer valid', async () => {
    const cardId = await readyCardId()
    vi.spyOn(services().redemption, 'requestCode').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    await mountComposable(useRewardRedemptionScreen, { route: `/premios/${cardId}` })
    await flushPromises()
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('shows an active ticket with the minutes left for a ready reward', async () => {
    const cardId = await readyCardId()
    const { result } = await mountComposable(useRewardRedemptionScreen, { route: `/premios/${cardId}` })
    await vi.waitFor(() => expect(result.ticket?.kind).toBe('active'))
    expect(result.announcement).not.toBe('')
    expect(result.title).toBe('Mostre este código no balcão')
    expect(result.canRetry).toBe(false)
  })

  it('only offers a retry when the failure was the network', async () => {
    const cardId = await readyCardId()
    vi.spyOn(services().redemption, 'requestCode').mockResolvedValue({ ok: false, error: { code: 'network' } })
    const { result } = await mountComposable(useRewardRedemptionScreen, { route: `/premios/${cardId}` })
    await flushPromises()
    expect(result.canRetry).toBe(true)
    expect(result.errorText).not.toBe('')
  })
})
