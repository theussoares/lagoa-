import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface ActiveProgramData {
  shopId: string
  program: Program
}

export abstract class ProgramRepository {
  /**
   * Busca a loja do lojista autenticado e o programa ativo associado.
   * Retorna null caso o lojista não tenha loja cadastrada ou não possua programa ativo.
   */
  abstract findActiveProgramByOwner(ownerUserId: string): Promise<ActiveProgramData | null>

  /**
   * Conta o total de cartões de fidelidade emitidos para a loja.
   */
  abstract countCardsByShopId(shopId: string): Promise<number>

  /**
   * Troca o programa ativo numa transação que trava a loja (`FOR UPDATE`), então a contagem de
   * cartões que `decide` vê vale até o commit: um cliente que entra no clube espera a troca acabar.
   * `decide` devolve se a troca cria nova versão (desativa a ativa e cancela os QRs da visita abertos)
   * ou só atualiza o prêmio da linha ativa; um erro desfaz tudo. `notFound` se o lojista não tem programa ativo.
   */
  abstract updateActiveProgram(
    ownerUserId: string,
    draft: ProgramDraft,
    decide: (current: Program, cardsCount: number) => Result<{ isNewVersion: boolean }, ErrorOf<'programModeLocked'>>,
  ): Promise<Result<Program, ErrorOf<'notFound' | 'programModeLocked'>>>
}
