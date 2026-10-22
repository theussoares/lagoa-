import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp, useRouter } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock, visibleText } from '#layers/core/test/pageHarness.nuxt'
import type { StampCardModel } from '#layers/ui/app/types/wallet'
import { useWalletScreen } from '../app/composables/useWalletScreen'
import WalletPage from '../app/pages/wallet.vue'

const flag = vi.hoisted(() => ({ hits: false }))
mockNuxtImport('useHitsEnabled', () => () => flag.hits)

const SEEN_KEY = 'lagoa:seen-balances'

let wrapper: VueWrapper | undefined
let composable: VueWrapper | undefined

async function mountWallet(route: string): Promise<VueWrapper> {
  wrapper = await mountSuspended(WalletPage, { route })
  await flushPromises()
  return wrapper
}

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

function tabs(page: VueWrapper): Array<ReturnType<VueWrapper['get']>> {
  return page.findAll(`nav[aria-label="${t('wallet.tabs.label')}"] a`)
}

beforeEach(() => {
  resetWorld({ customer: anaSession })
  clearNuxtData()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  composable?.unmount()
  composable = undefined
  flag.hits = false
  restoreClock()
})

describe('wallet tabs with the hits flag off', () => {
  it('has no tabs and ignores ?aba=premios', async () => {
    const page = await mountWallet('/carteira?aba=premios')
    expect(page.find(`nav[aria-label="${t('wallet.tabs.label')}"]`).exists()).toBe(false)
    expect(visibleText(page)).not.toContain(t('rewards.readyTitle'))
    expect(visibleText(page)).toContain(t('wallet.ledgerTitle'))
  })
})

describe('wallet tabs with the hits flag on', () => {
  beforeEach(() => {
    flag.hits = true
  })

  it('opens on Cartões, linking to both tabs', async () => {
    const page = await mountWallet('/carteira')
    const links = tabs(page)
    expect(links.map((link) => link.text())).toEqual(['Cartões', 'Prêmios'])
    expect(links.map((link) => link.attributes('href'))).toEqual(['/carteira', '/carteira?aba=premios'])
    expect(links[0]?.attributes('aria-current')).toBe('page')
    expect(links[1]?.attributes('aria-current')).toBeUndefined()
    expect(visibleText(page)).not.toContain(t('rewards.readyTitle'))
  })

  it('shows the ready rewards section on ?aba=premios', async () => {
    const page = await mountWallet('/carteira?aba=premios')
    expect(tabs(page).map((link) => link.attributes('aria-current'))).toEqual([undefined, 'page'])
    await vi.waitFor(() => expect(visibleText(page)).toContain(t('rewards.readyTitle')))
    expect(visibleText(page)).not.toContain(t('wallet.ledgerTitle'))
  })

  it('keeps a new stamp unseen on the Prêmios tab, so Cartões still plays it', async () => {
    const hasFreshStamp = (cards: readonly StampCardModel[]): boolean =>
      cards.some((card) => card.body.kind === 'slots' && card.body.slots.some((slot) => slot.fresh))
    const cards = await useNuxtApp().$customerServices.wallet.listCards()
    if (!cards.ok) throw new Error('the example seed has no cards')
    const unseen = Object.fromEntries(cards.value.map((card) => [card.id, 0]))
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(unseen))

    const mounted = await mountComposable(useWalletScreen, { route: '/carteira?aba=premios' })
    composable = mounted.wrapper
    await flushPromises()
    expect(mounted.result.section).toBe('rewards')
    expect(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}')).toEqual(unseen)

    await useRouter().push('/carteira')
    await flushPromises()
    expect(mounted.result.section).toBe('cards')
    expect(hasFreshStamp(mounted.result.cards)).toBe(true)
    await vi.waitFor(() => expect(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}')).not.toEqual(unseen))
  })
})
