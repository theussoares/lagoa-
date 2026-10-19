import type { AdminEventKind } from '#shared/schemas/admin'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface AdminRecord {
  readonly id: string
  readonly name: string
  readonly emailEncrypted: Buffer
  readonly disabledAt: Date | null
  readonly createdAt: Date
}

export interface NewAdmin {
  /** O `auth.users.id` que o Supabase devolveu. */
  readonly id: string
  readonly name: string
  readonly emailEncrypted: Buffer
  readonly emailHash: Buffer
  /** `null` só no primeiro admin, criado pelo `admin:create`. */
  readonly invitedBy: string | null
  /** Quem fica no `admin_events`: quem convidou, ou o próprio admin no `admin:create` (a coluna é obrigatória). */
  readonly actorAdminId: string
}

/** Lida sob o lock da linha: o que a desativação/reativação vai gravar, ou por que não vale. */
export type StatusChangeDecision = (current: AdminRecord) => Result<{ readonly disabledAt: Date | null }, ErrorOf<'invalidTransition'>>

export type StatusChangeError = ErrorOf<'forbidden'> | ErrorOf<'notFound'> | ErrorOf<'invalidTransition'>

export abstract class AdminTeamRepository {
  /** Mais antigos primeiro (`created_at`, `id`); no máximo `limit`. */
  abstract list(limit: number): Promise<readonly AdminRecord[]>
  abstract find(id: string): Promise<AdminRecord | null>
  /** Algum admin (desativado inclusive) já usa este e-mail. */
  abstract emailTaken(emailHash: Buffer): Promise<boolean>
  /** Grava o admin e o `admin_events(kind='invite')` na mesma transação. Id ou e-mail repetido é `alreadyExists`. */
  abstract insert(admin: NewAdmin): Promise<Result<AdminRecord, ErrorOf<'alreadyExists'>>>
  /**
   * Numa transação: trava a linha do alvo **e a de quem age** (`FOR UPDATE`, em ordem de id para dois pedidos cruzados
   * não se travarem), recusa (`forbidden`) se quem age já não está ativo, deixa `decide` aprovar e grava `disabled_at` e o
   * evento (`disable` ou `reactivate`). Assim dois admins desativando um ao outro ao mesmo tempo não zeram a equipe: o
   * segundo encontra o próprio `disabled_at` preenchido.
   */
  abstract changeStatus(id: string, actorAdminId: string, decide: StatusChangeDecision): Promise<Result<AdminRecord, StatusChangeError>>
  abstract recordEvent(actorAdminId: string, kind: AdminEventKind, targetAdminId: string): Promise<void>
}
