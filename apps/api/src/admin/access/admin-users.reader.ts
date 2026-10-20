/** Contrato: se o usuário do token está em `admin_users` e não foi desativado. */
export abstract class AdminUsersReader {
  abstract isActiveAdmin(userId: string): Promise<boolean>
}
