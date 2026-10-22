import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { clearError, clearNuxtData, useError, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock, visibleText } from '#layers/core/test/pageHarness.nuxt'
import { PublicHitItemSchema } from '#shared/schemas/showcase'
import type { PublicHitItem, PublicHitItemPage } from '#shared/schemas/showcase'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import HitsPage from '../app/pages/hits-showcase.vue'

const flag = vi.hoisted(() => ({ hits: true }))
mockNuxtImport('useHitsEnabled', () => () => flag.hits)

const CURSOR = '0b6a4f6e-2f8e-4d4f-9a35-6c3e1f0d7a10'
let wrapper: VueWrapper | undefined

function hitItem(index: number, overrides: Partial<PublicHitItem> = {}): PublicHitItem {
  return PublicHitItemSchema.parse({
    id: `6f1d1f8e-3c55-4d8c-9a36-0a4c0f6a2b${String(index).padStart(2, '0')}`,
    title: `Produto ${index}`,
    description: null,
    priceCents: 4500,
    photoUrl: `https://cdn.lagoa.test/hits/${index}.webp`,
    earning: null,
    contact: null,
    shop: { id: 'shop_barbearia', name: 'Barbearia Navalha', category: 'barbershop', neighborhood: 'Centro' },
    ...overrides,
  })
}

function page(items: PublicHitItem[], nextCursor: string | null = null): Result<PublicHitItemPage, TransportError> {
  return { ok: true, value: { items, nextCursor } }
}

function hits(): ReturnType<typeof useNuxtApp>['$customerServices']['hits'] {
  return useNuxtApp().$customerServices.hits
}

function t(key: string): string {
  return useNuxtApp().$i18n.t(key)
}

async function mountHits(): Promise<VueWrapper> {
  wrapper = await mountSuspended(HitsPage, { route: '/vitrine' })
  await flushPromises()
  return wrapper
}

function titles(view: VueWrapper): string[] {
  return view.findAll('article h3').map((title) => title.text())
}

async function pickGroup(view: VueWrapper, label: string): Promise<void> {
  const chip = view.findAll('button').find((button) => button.text() === label)
  if (!chip) throw new Error(`no chip ${label}`)
  await chip.trigger('click')
}

beforeEach(() => {
  resetWorld({ customer: anaSession })
  clearNuxtData()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  clearNuxtData()
  void clearError()
  vi.restoreAllMocks()
  restoreClock()
  flag.hits = true
})

describe('hits page', () => {
  it('is a 404 when the hits flag is off', async () => {
    flag.hits = false
    await mountHits()
    expect(useError().value?.statusCode).toBe(404)
  })

  it('says the showcase is empty and hides the banners when there is nothing', async () => {
    const view = await mountHits()
    expect(visibleText(view)).toContain(t('hits.title'))
    expect(visibleText(view)).toContain(t('hits.empty'))
    expect(view.find(`section[aria-label="${t('hits.bannersLabel')}"]`).exists()).toBe(false)
  })

  it('shows the paid and Pro banners with their seals', async () => {
    vi.spyOn(hits(), 'banners').mockResolvedValue({
      ok: true,
      value: [
        { item: hitItem(1, { title: 'Coleção de verão' }), sponsored: true },
        { item: hitItem(2, { title: 'Combo pizza' }), sponsored: false },
      ],
    })
    const view = await mountHits()
    const banners = view.get(`section[aria-label="${t('hits.bannersLabel')}"]`)
    expect(banners.findAll('li').map((banner) => banner.findAll('span').map((part) => part.text()))).toEqual([
      ['Patrocinado', 'Coleção de verão', 'Barbearia Navalha'],
      ['Destaque', 'Combo pizza', 'Barbearia Navalha'],
    ])
  })

  it('renders price, earning seal and the product button only when there is a contact', async () => {
    vi.spyOn(hits(), 'list').mockResolvedValue(
      page([
        hitItem(1, { earning: { unit: 'stamp', units: 1, doubled: true }, contact: { kind: 'url', url: 'https://barbearia.test/agendar', ctaLabel: 'Agendar' } }),
        hitItem(2, { priceCents: null }),
      ]),
    )
    const view = await mountHits()
    const [withContact, withoutContact] = view.findAll('article')
    if (!withContact || !withoutContact) throw new Error('expected two product cards')
    expect(withContact.text()).toContain('R$')
    expect(withContact.text()).toContain('rende 1 carimbo')
    expect(withContact.text()).toContain('em dobro hoje')
    const button = withContact.get('a')
    expect(button.attributes()).toMatchObject({ href: 'https://barbearia.test/agendar', target: '_blank' })
    expect(button.attributes('rel')).toContain('noopener noreferrer')
    expect(button.text()).toContain('Agendar')
    expect(withoutContact.text()).toContain('Sob consulta')
    expect(withoutContact.text()).not.toContain('rende')
    expect(withoutContact.find('a').exists()).toBe(false)
  })

  it('says the group is empty when the chosen group has no product', async () => {
    const list = vi.spyOn(hits(), 'list').mockImplementation((query) => Promise.resolve(page(query.group ? [] : [hitItem(1)])))
    const view = await mountHits()
    await pickGroup(view, t('discover.groups.pet'))
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith({ group: 'pet' })
    expect(visibleText(view)).toContain(t('hits.groupEmpty'))
    expect(visibleText(view)).not.toContain(t('hits.empty'))
  })

  it('asks for the next page with the cursor and appends it', async () => {
    const list = vi
      .spyOn(hits(), 'list')
      .mockImplementation((query) => Promise.resolve(query.cursor ? page([hitItem(3)]) : page([hitItem(1), hitItem(2)], CURSOR)))
    const view = await mountHits()
    const more = view.findAll('button').find((button) => button.text() === t('hits.loadMore'))
    await more?.trigger('click')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith({ cursor: CURSOR })
    expect(titles(view)).toEqual(['Produto 1', 'Produto 2', 'Produto 3'])
    expect(view.findAll('button').some((button) => button.text() === t('hits.loadMore'))).toBe(false)
  })

  it('ignores a late answer for a group the person already left', async () => {
    let answerFood: (value: Result<PublicHitItemPage, TransportError>) => void = () => undefined
    vi.spyOn(hits(), 'list').mockImplementation((query) => {
      if (query.group === 'food') return new Promise((resolve) => (answerFood = resolve))
      if (query.group === 'pet') return Promise.resolve(page([hitItem(9, { title: 'Banho e tosa' })]))
      return Promise.resolve(page([hitItem(1)]))
    })
    const view = await mountHits()
    await pickGroup(view, t('discover.groups.food'))
    await pickGroup(view, t('discover.groups.pet'))
    await flushPromises()
    answerFood(page([hitItem(5, { title: 'Pizza grande' })]))
    await flushPromises()
    expect(titles(view)).toEqual(['Banho e tosa'])
  })
})
