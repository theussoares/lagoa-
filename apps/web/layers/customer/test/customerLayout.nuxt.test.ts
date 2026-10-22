import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { clearNuxtData, useRouter } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock, visibleText } from '#layers/core/test/pageHarness.nuxt'
import CustomerLayout from '../app/layouts/customer.vue'
import RewardsPage from '../app/pages/rewards.vue'

const flag = vi.hoisted(() => ({ hits: false }))
mockNuxtImport('useHitsEnabled', () => () => flag.hits)
mockNuxtImport('navigateTo', (original) => vi.fn(original))

let wrapper: VueWrapper | undefined

async function mountLayout(route = '/carteira'): Promise<VueWrapper> {
  wrapper = await mountSuspended(CustomerLayout, { route, attachTo: document.body, slots: { default: () => 'conteúdo' } })
  await flushPromises()
  return wrapper
}

function tabNames(layout: VueWrapper): string[] {
  return layout.get('nav').findAll('li').map((item) => item.text())
}

beforeEach(() => {
  resetWorld({ customer: anaSession })
  clearNuxtData()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  flag.hits = false
  vi.mocked(navigateTo).mockClear()
  restoreClock()
})

describe('customer layout with the hits flag off', () => {
  it('keeps the four old tabs around the check-in action', async () => {
    const layout = await mountLayout()
    expect(tabNames(layout)).toEqual(['Carteira', 'Descobrir', 'Carimbar', 'Prêmios', 'Perfil'])
    expect(layout.get('nav').findAll('a').map((anchor) => anchor.attributes('href'))).toEqual(['/carteira', '/descobrir', '/check-in', '/premios', '/perfil'])
    expect(layout.get('nav').find('button').exists()).toBe(false)
  })

  it('still renders the rewards screen at /premios', async () => {
    wrapper = await mountSuspended(RewardsPage, { route: '/premios' })
    await flushPromises()
    expect(useRouter().currentRoute.value.fullPath).toBe('/premios')
    expect(visibleText(wrapper)).toContain('Prêmios')
    expect(navigateTo).not.toHaveBeenCalledWith('/carteira?aba=premios', expect.anything())
  })
})

describe('customer layout with the hits flag on', () => {
  beforeEach(() => {
    flag.hits = true
  })

  it('shows Descobrir, Hits, Carimbar, Carteira and a Mais button', async () => {
    const layout = await mountLayout()
    expect(tabNames(layout)).toEqual(['Descobrir', 'Hits', 'Carimbar', 'Carteira', 'Mais'])
    expect(layout.get('nav').findAll('a').map((anchor) => anchor.attributes('href'))).toEqual(['/descobrir', '/hits', '/check-in', '/carteira'])
    const more = layout.get('nav button')
    expect(more.text()).toBe('Mais')
    expect(more.attributes('aria-haspopup')).toBe('dialog')
  })

  it('opens the more menu with Ranking and Perfil, and no invite', async () => {
    const layout = await mountLayout()
    await layout.get('nav button').trigger('click')
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    const links = Array.from(dialog?.querySelectorAll('a') ?? [])
    expect(links.map((anchor) => anchor.getAttribute('href'))).toEqual(['/ranking', '/perfil'])
    expect(links.map((anchor) => anchor.textContent?.trim())).toEqual(['Ranking', 'Perfil'])
    expect(dialog?.textContent ?? '').not.toMatch(/Convidar/i)
    expect(layout.get('nav button').attributes('aria-expanded')).toBe('true')
  })

  it('closes the more menu when the route changes', async () => {
    const layout = await mountLayout()
    await layout.get('nav button').trigger('click')
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    await useRouter().push('/descobrir')
    await flushPromises()
    expect(layout.get('nav button').attributes('aria-expanded')).toBe('false')
  })

  it('sends /premios to the rewards tab of the wallet with a permanent redirect', async () => {
    wrapper = await mountSuspended(RewardsPage, { route: '/premios' })
    await flushPromises()
    expect(navigateTo).toHaveBeenCalledWith('/carteira?aba=premios', { redirectCode: 301 })
    expect(useRouter().currentRoute.value.fullPath).toBe('/carteira?aba=premios')
  })
})
