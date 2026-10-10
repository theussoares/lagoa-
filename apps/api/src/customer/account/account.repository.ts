export type EraseOutcome = 'erased' | 'notFound' | 'ownsShop'

export abstract class AccountRepository {
  /**
   * Apaga os dados pessoais da pessoa (anonimiza a conta e remove o login). A caderneta fica, sem nome
   * nem contato, para o histórico das lojas. `notFound` quando não há perfil; `ownsShop` (nada é apagado) quando a
   * pessoa é dona de loja: apagar o login deixaria a loja sem acesso.
   */
  abstract erase(userId: string, now: Date): Promise<EraseOutcome>
}
