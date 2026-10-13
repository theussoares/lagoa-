import { afterEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import type { StampCardModel } from '#layers/ui/app/types/wallet'
import CardList from '../app/components/wallet/CardList.vue'
import Filters from '../app/components/wallet/Filters.vue'

afterEach(unmountAll)

function card(id: string, shopName: string): StampCardModel {
  return {
    id,
    shopName,
    shopDetail: 'Centro',
    icon: 'i-ph-storefront',
    progress: '03/10',
    body: { kind: 'ruler', balance: 3, target: 10, label: '3 de 10 carimbos' },
    status: { kind: 'remaining', count: '7', unitLine: 'carimbos para', reward: 'Corte grátis' },
    peek: 'Faltam 7 carimbos',
    summary: `${shopName}: 3 de 10.`,
    rewardReady: false,
    note: null,
    contact: null,
  }
}

const listProps = (expandedId: string) => ({
  cards: [card('a', 'Café da Orla'), card('b', 'Barbearia Navalha')],
  expandedId,
  toggleLabel: (item: StampCardModel, expanded: boolean) => `${expanded ? 'Fechar' : 'Abrir'} ${item.shopName}`,
})

const toggles = (page: VueWrapper) => page.findAll('button[aria-expanded]')

describe('wallet: CardList', () => {
  it('shows one compact row per card and opens only the chosen one', async () => {
    const page = await mountComponent(CardList, listProps('b'))
    expect(toggles(page).map((button) => button.attributes('aria-expanded'))).toEqual(['false', 'true'])
    expect(page.findAll('[role="region"]')).toHaveLength(1)
    expect(page.get('[role="region"]').text()).toContain('Corte grátis')
    // A linha já diz a loja e o progresso: o cartão aberto não repete o cabeçalho.
    expect(page.get('[role="region"]').text()).not.toContain('03/10')
  })

  it('asks to toggle the card of the row that was tapped', async () => {
    const page = await mountComponent(CardList, listProps(''))
    expect(page.findAll('[role="region"]')).toHaveLength(0)
    await toggles(page)[0]?.trigger('click')
    expect(page.emitted('toggle')).toEqual([['a']])
  })

  it('names the row for screen readers with the action it does', async () => {
    const page = await mountComponent(CardList, listProps('a'))
    expect(toggles(page).map((button) => button.attributes('aria-label'))).toEqual(['Fechar Café da Orla', 'Abrir Barbearia Navalha'])
  })
})

describe('wallet: Filters', () => {
  const props = {
    options: [
      { value: 'all', label: 'Todos', count: 3 },
      { value: 'ready', label: 'Prêmio liberado', count: 1 },
    ],
    filter: 'all',
    query: '',
    searchLabel: 'Buscar e filtrar seus cartões',
    searchPlaceholder: 'Buscar loja',
    clearLabel: 'Limpar a busca',
  }

  it('marks the active tab as pressed and shows each count', async () => {
    const page = await mountComponent(Filters, props)
    const tabs = page.findAll('button[aria-pressed]')
    expect(tabs.map((tab) => tab.attributes('aria-pressed'))).toEqual(['true', 'false'])
    expect(tabs[1]?.text()).toContain('1')
  })

  it('asks to change the tab and the search', async () => {
    const page = await mountComponent(Filters, props)
    await page.findAll('button[aria-pressed]')[1]?.trigger('click')
    expect(page.emitted('update:filter')).toEqual([['ready']])
    await page.get('input[type="search"]').setValue('café')
    expect(page.emitted('update:query')?.at(-1)).toEqual(['café'])
  })

  it('offers to clear the search only when there is one', async () => {
    const empty = await mountComponent(Filters, props)
    expect(empty.find('button[aria-label="Limpar a busca"]').exists()).toBe(false)
    const typed = await mountComponent(Filters, { ...props, query: 'café' })
    await typed.get('button[aria-label="Limpar a busca"]').trigger('click')
    expect(typed.emitted('update:query')).toEqual([['']])
  })
})
