import type { Program, ProgramDraft } from '#shared/schemas/program'

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
   * Salva as alterações no programa.
   * Se `isNewVersion` for true, desativa a versão anterior (`active = false`) e insere nova linha ativa.
   * Se for false (ex.: apenas atualização de título do prêmio), atualiza a linha ativa existente in-place.
   */
  abstract saveProgram(
    shopId: string,
    currentProgramId: string,
    draft: ProgramDraft,
    isNewVersion: boolean,
  ): Promise<Program>
}
