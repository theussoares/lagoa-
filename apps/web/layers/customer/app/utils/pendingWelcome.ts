import type { WalletCard } from '#shared/schemas/loyaltyCard'

/** Unidades de boas-vindas que ainda vão entrar: o cartão não teve visita e a loja deixa as boas-vindas ligadas. */
export function pendingWelcomeUnits(card: WalletCard | null): number {
  if (card === null || card.lastVisitAt !== null) return 0
  return Math.max(0, card.shop.program.welcomeUnits)
}
