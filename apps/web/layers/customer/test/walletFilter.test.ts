import { describe, expect, it } from 'vitest'
import type { StampCardModel } from '#layers/ui/app/types/wallet'
import { countWalletCards, filterWalletCards } from '../app/utils/walletFilter'

function card(id: string, shopName: string, rewardReady: boolean, shopDetail = 'Centro'): StampCardModel {
  return {
    id,
    shopName,
    shopDetail,
    icon: 'i-ph-storefront',
    progress: '01/10',
    body: { kind: 'ruler', balance: 1, target: 10, label: '1 de 10' },
    status: { kind: 'remaining', count: '9', unitLine: 'carimbos', reward: 'Prêmio' },
    peek: 'Faltam 9',
    summary: '',
    rewardReady,
    note: null,
    contact: null,
  }
}

const cards = [card('a', 'Café da Orla', false, 'Orla'), card('b', 'Pizzaria Forno à Lenha', true), card('c', 'Barbearia Navalha', false)]

describe('filterWalletCards', () => {
  it('filters by tab', () => {
    expect(filterWalletCards(cards, 'all', '')).toHaveLength(3)
    expect(filterWalletCards(cards, 'ready', '').map((item) => item.id)).toEqual(['b'])
    expect(filterWalletCards(cards, 'progress', '').map((item) => item.id)).toEqual(['a', 'c'])
  })

  it('searches the shop name or neighborhood, without accent or case', () => {
    expect(filterWalletCards(cards, 'all', 'CAFE').map((item) => item.id)).toEqual(['a'])
    expect(filterWalletCards(cards, 'all', 'orla').map((item) => item.id)).toEqual(['a'])
    expect(filterWalletCards(cards, 'all', 'lenha').map((item) => item.id)).toEqual(['b'])
    expect(filterWalletCards(cards, 'all', 'xyz')).toEqual([])
  })

  it('combines the tab and the search', () => {
    expect(filterWalletCards(cards, 'ready', 'cafe')).toEqual([])
    expect(filterWalletCards(cards, 'progress', 'cafe').map((item) => item.id)).toEqual(['a'])
  })
})

describe('countWalletCards', () => {
  it('counts each tab, ignoring the search', () => {
    expect(countWalletCards(cards)).toEqual({ all: 3, ready: 1, progress: 2 })
  })
})
