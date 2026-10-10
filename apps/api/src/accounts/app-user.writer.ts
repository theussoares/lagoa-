import { appUsers } from '../database/schema'
import type { Tx } from '../database/database.module'

export interface NewAppUser {
  readonly userId: string
  readonly phoneEncrypted: Buffer
  readonly phoneHash: Buffer
  readonly emailEncrypted: Buffer | null
  readonly emailHash: Buffer | null
}

/**
 * Garante a linha de `app_users` de quem acabou de entrar pelo Supabase (o id é o `auth.users.id`). Cliente e lojista
 * dividem a conta: quem já existe é aproveitado, com o celular que ela guarda. Celular ou e-mail de outra conta viola
 * a constraint única, e quem chama traduz (`uniqueViolationConstraint`).
 */
export async function ensureAppUser(tx: Tx, user: NewAppUser): Promise<void> {
  await tx
    .insert(appUsers)
    .values({
      id: user.userId,
      emailEncrypted: user.emailEncrypted,
      emailHash: user.emailHash,
      phoneEncrypted: user.phoneEncrypted,
      phoneHash: user.phoneHash,
    })
    .onConflictDoNothing({ target: appUsers.id })
}
