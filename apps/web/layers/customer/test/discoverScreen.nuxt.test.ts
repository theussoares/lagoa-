import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { mountComposable as mountHarness } from '#layers/core/test/composableHarness.nuxt'
import type { MountedComposable } from '#layers/core/test/composableHarness.nuxt'
import { resetWorld, restoreClock, visibleText } from '#layers/core/test/pageHarness.nuxt'
import type { FeaturedShop } from '#shared/schemas/showcase'
import { useDiscoverScreen } from '../app/composables/useDiscoverScreen'
import DiscoverPage from '../app/pages/discover.vue'

const { signOutMock, flag } = vi.hoisted(() => ({ signOutMock: vi.fn(), flag: { hits: false } }))
// O middleware da página só quer saber se há sessão: o mundo do teste já começa com a Ana.
mockNuxtImport('useCustomerSession', () => () => ({ signOut: signOutMock, restore: () => Promise.resolve(true) }))
mockNuxtImport('useHitsEnabled', () => () => flag.hits)

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
  flag.hits = false
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

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

async function mountPage(): Promise<VueWrapper> {
  const page = await mountSuspended(DiscoverPage, { route: '/descobrir' })
  mounted.push(page)
  await flushPromises()
  return page
}

function carousel(page: VueWrapper): ReturnType<VueWrapper['find']> {
  return page.find(`section[aria-label="${t('discover.featuredLabel')}"]`)
}

async function featuredShops(): Promise<FeaturedShop[]> {
  const shops = await services().discover.listShops()
  if (!shops.ok) throw new Error('seed shops did not load')
  return shops.value.slice(0, 2).map((shop, index) => ({ ...shop, sponsored: index === 0 }))
}

describe('discover page with the hits flag off', () => {
  it('stays as today: no featured call, no group chips, the challenge hero on top', async () => {
    const listFeatured = vi.spyOn(services().discover, 'listFeatured')
    const page = await mountPage()
    expect(listFeatured).not.toHaveBeenCalled()
    expect(page.find(`[aria-label="${t('discover.groups.label')}"]`).exists()).toBe(false)
    expect(visibleText(page)).toContain(t('discover.challengeBadge'))
  })
})

describe('discover page with the hits flag on', () => {
  beforeEach(() => {
    flag.hits = true
  })

  it('shows no carousel when nothing is featured', async () => {
    vi.spyOn(services().discover, 'listFeatured').mockResolvedValue({ ok: true, value: [] })
    const page = await mountPage()
    expect(carousel(page).exists()).toBe(false)
    expect(page.find(`[aria-label="${t('discover.groups.label')}"]`).exists()).toBe(true)
  })

  it('seals every featured shop and links featured and rail cards where the shop tile goes', async () => {
    const featured = await featuredShops()
    vi.spyOn(services().discover, 'listFeatured').mockResolvedValue({ ok: true, value: featured })
    const seed = await services().discover.listShops()
    if (!seed.ok) throw new Error('seed shops did not load')
    vi.spyOn(services().discover, 'listShops').mockResolvedValue({
      ok: true,
      value: seed.value.map((shop, index) => ({ ...shop, surpriseDayToday: index === 0 })),
    })
    const page = await mountPage()
    const cards = carousel(page).findAll('li')
    expect(cards.map((card) => card.text().includes(t('discover.featuredBadge')))).toEqual([true, true])
    expect(visibleText(page)).not.toContain(t('discover.challengeBadge'))
    const tileHref = page.find('section[aria-labelledby="known-title"] li a').attributes('href')
    const rail = page.findAll('section').find((section) => section.find('h2').exists() && section.find('h2').text() === t('discover.rails.surpriseDay'))
    expect(tileHref).toBe('/carteira')
    expect(cards[0]?.find('a').attributes('href')).toBe(tileHref)
    expect(rail?.find('li a').attributes('href')).toBe(tileHref)
  })

  it('signs out when the featured shops say the session is no longer valid', async () => {
    vi.spyOn(services().discover, 'listFeatured').mockResolvedValue({ ok: false, error: { code: 'unauthorized' } })
    const { result } = await mountComposable(useDiscoverScreen)
    await flushPromises()
    expect(result.featured).toEqual([])
    expect(signOutMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the rest of the screen when the featured shops fail to load', async () => {
    vi.spyOn(services().discover, 'listFeatured').mockResolvedValue({ ok: false, error: { code: 'network' } })
    const page = await mountPage()
    expect(carousel(page).exists()).toBe(false)
    expect(page.find(`[aria-label="${t('discover.groups.label')}"]`).exists()).toBe(true)
    expect(page.find('#fresh-title').exists()).toBe(true)
  })

  it('filters by group and says so when the group has no shop', async () => {
    const page = await mountPage()
    const chips = page.findAll(`[aria-label="${t('discover.groups.label')}"] button`)
    expect(chips.map((chip) => chip.text())).toEqual(['Tudo', 'Comer', 'Beleza', 'Roupas', 'Serviços', 'Pet'])
    expect(chips[0]?.attributes('aria-pressed')).toBe('true')
    await chips[3]?.trigger('click')
    expect(chips[3]?.attributes('aria-pressed')).toBe('true')
    expect(chips[0]?.attributes('aria-pressed')).toBe('false')
    expect(visibleText(page)).toContain(t('discover.groupEmpty'))
    expect(page.find('#fresh-title').exists()).toBe(false)
  })

  it('turns the carousel, chips and rails off while searching', async () => {
    vi.spyOn(services().discover, 'listFeatured').mockResolvedValue({ ok: true, value: await featuredShops() })
    const { result } = await mountComposable(useDiscoverScreen)
    await vi.waitFor(() => expect(result.loading).toBe(false))
    expect(result.showGroups).toBe(true)
    result.group = 'clothing'
    expect(result.groupEmpty).toBe(true)
    expect(result.featured).toHaveLength(2)
    result.query = 'Café'
    expect(result.featured).toEqual([])
    expect(result.headerOverlap).toBe(false)
    expect(result.showGroups).toBe(false)
    expect(result.rails).toEqual([])
    expect(result.groupEmpty).toBe(false)
    expect(result.fresh.length + result.known.length).toBeGreaterThan(0)
  })
})
