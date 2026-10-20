/** Quem opera o painel da rede: o `admin_users.id`, que é o mesmo `sub` do token. */
export interface AdminContext {
  readonly adminId: string
}
