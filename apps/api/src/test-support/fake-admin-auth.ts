import { randomUUID } from 'node:crypto'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { AdminAuth, type AdminInviteError } from '../admin/team/admin-auth'

/** `AdminAuth` sem Supabase: guarda o que foi pedido e responde o que o teste mandar. */
export class FakeAdminAuth extends AdminAuth {
  readonly invited: { email: string; name: string; userId: string }[] = []
  readonly cancelled: string[] = []
  readonly mfaResets: string[] = []
  inviteFailure: AdminInviteError | null = null
  mfaFailure: ErrorOf<'network'> | null = null

  async invite(email: string, name: string): Promise<Result<{ userId: string }, AdminInviteError>> {
    if (this.inviteFailure !== null) return err(this.inviteFailure)
    const userId = randomUUID()
    this.invited.push({ email, name, userId })
    return ok({ userId })
  }

  async cancelInvite(userId: string): Promise<void> {
    this.cancelled.push(userId)
  }

  async deleteMfaFactors(userId: string): Promise<Result<void, ErrorOf<'network'>>> {
    if (this.mfaFailure !== null) return err(this.mfaFailure)
    this.mfaResets.push(userId)
    return ok(undefined)
  }
}
