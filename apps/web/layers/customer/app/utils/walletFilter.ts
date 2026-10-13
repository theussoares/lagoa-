import type { StampCardModel } from '#layers/ui/app/types/wallet'
import type { WalletFilter } from '../types/wallet'

export const WALLET_FILTERS: readonly WalletFilter[] = ['all', 'ready', 'progress']

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

const matchesFilter = (card: StampCardModel, filter: WalletFilter): boolean =>
  filter === 'all' || (filter === 'ready' ? card.rewardReady : !card.rewardReady)

/** Cartões da aba escolhida, depois pela busca (nome ou bairro, sem acento e sem diferenciar maiúscula). */
export function filterWalletCards(cards: readonly StampCardModel[], filter: WalletFilter, query: string): StampCardModel[] {
  const needle = normalizeText(query)
  return cards.filter(
    (card) => matchesFilter(card, filter) && (needle === '' || normalizeText(`${card.shopName} ${card.shopDetail}`).includes(needle)),
  )
}

/** Quantos cartões cabem em cada aba (a busca não entra: o número é da aba). */
export function countWalletCards(cards: readonly StampCardModel[]): Record<WalletFilter, number> {
  return {
    all: cards.length,
    ready: cards.filter((card) => matchesFilter(card, 'ready')).length,
    progress: cards.filter((card) => matchesFilter(card, 'progress')).length,
  }
}
