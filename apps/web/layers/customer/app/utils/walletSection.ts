import type { WalletSection } from '../types/wallet'

const WALLET_PATH = '/carteira'
/** `?aba=premios`: o slug é o que a pessoa vê na URL. */
const WALLET_SECTION_PARAM = 'aba'
const REWARDS_SECTION_SLUG = 'premios'

/** Seção pedida na URL; qualquer outro valor (ou nenhum) é a dos cartões. */
export function walletSectionFrom(query: Record<string, unknown>): WalletSection {
  return query[WALLET_SECTION_PARAM] === REWARDS_SECTION_SLUG ? 'rewards' : 'cards'
}

export function walletSectionPath(section: WalletSection): string {
  return section === 'rewards' ? `${WALLET_PATH}?${WALLET_SECTION_PARAM}=${REWARDS_SECTION_SLUG}` : WALLET_PATH
}
