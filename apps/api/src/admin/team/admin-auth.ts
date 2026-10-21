import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

/** `alreadyExists`: o e-mail já tem conta no Supabase (de cliente, lojista ou admin); `network`: o Supabase não confirmou. */
export type AdminInviteError = ErrorOf<'alreadyExists'> | ErrorOf<'network'>

/** Contas de admin no Supabase Auth (API admin, com a service role). Só a equipe da rede e o `admin:create` usam. */
export abstract class AdminAuth {
  /**
   * Cria a conta já com `app_metadata.role = 'admin'` e manda o e-mail de convite. Nunca reaproveita uma conta que já
   * exista: um cliente ou lojista não vira admin.
   */
  abstract invite(email: string, name: string): Promise<Result<{ userId: string }, AdminInviteError>>
  /** Desfaz o `invite` (apaga a conta recém-criada) quando a linha em `admin_users` não pôde ser gravada. Melhor esforço. */
  abstract cancelInvite(userId: string): Promise<void>
  /** Apaga os fatores TOTP: no próximo login a pessoa cadastra um autenticador novo. */
  abstract deleteMfaFactors(userId: string): Promise<Result<void, ErrorOf<'network'>>>
}
