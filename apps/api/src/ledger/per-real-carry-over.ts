export interface CarryOverProgram {
  readonly earnPer: string
  readonly unit: string
  readonly target: number
}

/**
 * Cartão em pontos por real não rende com o QR sem valor de um programa por visita, e o Balcão não emite QR com valor
 * nesse modo: ficando na versão antiga o cartão nunca mais andaria. Se a unidade é a mesma (ponto) e o prêmio ainda
 * não foi ganho, o saldo atravessa para a versão ativa na próxima visita. Com o prêmio pronto o cartão fica onde está
 * e troca de versão no resgate (`nextProgramFor`).
 */
export function carriesOverFromPerReal(balance: number, card: CarryOverProgram, active: CarryOverProgram): boolean {
  return balance > 0 && balance < card.target && card.earnPer === 'real' && active.earnPer !== 'real' && card.unit === active.unit
}
