export abstract class AccountRepository {
  /**
   * Apaga os dados pessoais da pessoa (anonimiza a conta e remove o login). A caderneta fica, sem nome
   * nem contato, para o histórico das lojas. `false` quando não há perfil.
   */
  abstract erase(userId: string, now: Date): Promise<boolean>
}
