import { Injectable } from '@nestjs/common'
import { ADMIN_TEAM_LIST_LIMIT } from '#shared/constants/domain'
import type { AdminInvite, AdminUser } from '#shared/schemas/admin'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { normalizeEmail, PiiService } from '../../common/pii.service'
import type { AdminContext } from '../access/admin.context'
import { AdminAuth, type AdminInviteError } from './admin-auth'
import { type AdminRecord, AdminTeamRepository } from './team.repository'
import { type AdminStatusAction, planStatusChange, refuseSelf } from './team.rules'

export type TeamActionError = ErrorOf<'forbidden'> | ErrorOf<'notFound'> | ErrorOf<'invalidTransition'> | ErrorOf<'network'>

/** Quem fica como autor e como quem convidou: outro admin, ou (`admin:create`) o próprio, sem quem convidou. */
type Inviter = { readonly kind: 'admin'; readonly adminId: string } | { readonly kind: 'bootstrap' }

/** Equipe da rede: listar, convidar, desativar, reativar e zerar o MFA, sempre com o registro de quem fez. */
@Injectable()
export class AdminTeamService {
  constructor(
    private readonly team: AdminTeamRepository,
    private readonly auth: AdminAuth,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  async list(): Promise<AdminUser[]> {
    const records = await this.team.list(ADMIN_TEAM_LIST_LIMIT)
    return records.map((record) => this.toAdminUser(record))
  }

  async invite(admin: AdminContext, invite: AdminInvite): Promise<Result<AdminUser, AdminInviteError>> {
    return this.create(invite, { kind: 'admin', adminId: admin.adminId })
  }

  /** Primeiro admin (`admin:create`): `admin_events.actor_admin_id` é obrigatório, então o autor é ele mesmo. */
  async bootstrap(invite: AdminInvite): Promise<Result<AdminUser, AdminInviteError>> {
    return this.create(invite, { kind: 'bootstrap' })
  }

  async disable(admin: AdminContext, id: string): Promise<Result<AdminUser, TeamActionError>> {
    return this.changeStatus(admin, id, 'disable')
  }

  async reactivate(admin: AdminContext, id: string): Promise<Result<AdminUser, TeamActionError>> {
    return this.changeStatus(admin, id, 'reactivate')
  }

  /** Só grava o evento depois que o Supabase confirmou: um reset que falhou não aparece na trilha como feito. */
  async resetMfa(admin: AdminContext, id: string): Promise<Result<AdminUser, TeamActionError>> {
    const self = refuseSelf(admin.adminId, id)
    if (!self.ok) return self
    const target = await this.team.find(id)
    if (target === null) return err({ code: 'notFound', entity: 'adminUser' })
    const reset = await this.auth.deleteMfaFactors(id)
    if (!reset.ok) return reset
    await this.team.recordEvent(admin.adminId, 'resetMfa', id)
    return ok(this.toAdminUser(target))
  }

  private async create(invite: AdminInvite, inviter: Inviter): Promise<Result<AdminUser, AdminInviteError>> {
    const email = normalizeEmail(invite.email)
    const emailHash = this.pii.hashEmail(email)
    // Admin desativado continua dono do e-mail (reativar, não convidar de novo); e assim o Supabase nem é chamado.
    if (await this.team.emailTaken(emailHash)) return err({ code: 'alreadyExists' })
    const account = await this.auth.invite(email, invite.name)
    if (!account.ok) return account
    const { userId } = account.value
    const saved = await this.team
      .insert({
        id: userId,
        name: invite.name,
        emailEncrypted: this.pii.encryptEmail(email),
        emailHash,
        invitedBy: inviter.kind === 'admin' ? inviter.adminId : null,
        actorAdminId: inviter.kind === 'admin' ? inviter.adminId : userId,
      })
      .catch(async (error: unknown) => {
        await this.auth.cancelInvite(userId)
        throw error
      })
    if (!saved.ok) {
      // Outro convite gravou o mesmo e-mail entre a checagem e o insert: a conta que criamos sobraria sem linha.
      await this.auth.cancelInvite(userId)
      return saved
    }
    return ok(this.toAdminUser(saved.value))
  }

  private async changeStatus(admin: AdminContext, id: string, action: AdminStatusAction): Promise<Result<AdminUser, TeamActionError>> {
    const self = refuseSelf(admin.adminId, id)
    if (!self.ok) return self
    const now = this.clock.now()
    const changed = await this.team.changeStatus(id, admin.adminId, (current) => planStatusChange(action, current, now))
    return changed.ok ? ok(this.toAdminUser(changed.value)) : changed
  }

  private toAdminUser(record: AdminRecord): AdminUser {
    return {
      id: record.id,
      name: record.name,
      email: this.pii.decrypt(record.emailEncrypted),
      disabledAt: record.disabledAt === null ? null : record.disabledAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
    }
  }
}
