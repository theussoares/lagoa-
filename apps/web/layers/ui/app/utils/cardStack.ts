/**
 * Maço de cartões: o ativo fica na frente e os demais aparecem como bordas (`peeks`).
 * Fechado, só as primeiras `maxPeeks` bordas; `hidden` diz quantas ficaram de fora.
 * Id desconhecido cai no primeiro cartão.
 */
export function stackPeeks<T extends { readonly id: string }>(
  cards: readonly T[],
  activeId: string,
  expanded: boolean,
  maxPeeks: number,
): { active: T | undefined; peeks: T[]; hidden: number } {
  const active = cards.find((card) => card.id === activeId) ?? cards[0]
  const rest = cards.filter((card) => card.id !== active?.id)
  const peeks = expanded ? rest : rest.slice(0, maxPeeks)
  return { active, peeks, hidden: rest.length - peeks.length }
}
