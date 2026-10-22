import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { clearNuxtData, useNuxtApp } from '#imports'
import { anaSession } from '#layers/core/test/fixtures'
import { resetWorld, restoreClock } from '#layers/core/test/pageHarness.nuxt'
import WalletPage from '../app/pages/wallet.vue'

const flag = vi.hoisted(() => ({ hits: false }))
mockNuxtImport('useHitsEnabled', () => () => flag.hits)

let wrapper: VueWrapper | undefined

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
  flag.hits = false
  restoreClock()
})

describe('wallet tabs with the hits flag off', () => {
  it('has no tabs and ignores ?aba=premios', async () => {
    const page = await mountWallet('/carteira?aba=premios')
    expect(page.find(`nav[aria-label="${t('wallet.tabs.label')}"]`).exists()).toBe(false)
    expect(page.find('#ready-title').exists()).toBe(false)
    expect(page.find('#ledger-title').exists()).toBe(true)
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
    expect(page.find('#ready-title').exists()).toBe(false)
  })

  it('shows the ready rewards section on ?aba=premios', async () => {
    const page = await mountWallet('/carteira?aba=premios')
    expect(tabs(page).map((link) => link.attributes('aria-current'))).toEqual([undefined, 'page'])
    await vi.waitFor(() => expect(page.find('#ready-title').exists()).toBe(true))
    expect(page.find('#ledger-title').exists()).toBe(false)
  })
})
