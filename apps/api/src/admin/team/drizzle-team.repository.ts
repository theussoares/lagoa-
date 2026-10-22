import { Inject, Injectable } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import type { AdminEventKind } from '#shared/schemas/admin'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { adminEvents, adminUsers } from '../../database/schema'
import { uniqueViolationConstraint } from '../../database/unique-violation'
import { type AdminRecord, AdminTeamRepository, type NewAdmin, type StatusChangeDecision, type StatusChangeError } from './team.repository'

const COLUMNS = {
  id: adminUsers.id,
  name: adminUsers.name,
  emailEncrypted: adminUsers.emailEncrypted,
  disabledAt: adminUsers.disabledAt,
  createdAt: adminUsers.createdAt,
}

@Injectable()
export class DrizzleAdminTeamRepository extends AdminTeamRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async list(limit: number): Promise<readonly AdminRecord[]> {
    return this.db.select(COLUMNS).from(adminUsers).orderBy(adminUsers.createdAt, adminUsers.id).limit(limit)
  }

  async find(id: string): Promise<AdminRecord | null> {
    const [row] = await this.db.select(COLUMNS).from(adminUsers).where(eq(adminUsers.id, id)).limit(1)
    return row ?? null
  }

  async emailTaken(emailHash: Buffer): Promise<boolean> {
    const [row] = await this.db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.emailHash, emailHash)).limit(1)
    return row !== undefined
  }

  async insert(admin: NewAdmin): Promise<Result<AdminRecord, ErrorOf<'alreadyExists'>>> {
    try {
      const record = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(adminUsers)
          .values({ id: admin.id, name: admin.name, emailEncrypted: admin.emailEncrypted, emailHash: admin.emailHash, invitedBy: admin.invitedBy })
          .returning(COLUMNS)
        if (!row) throw new Error('admin insert returned no row')
        await tx.insert(adminEvents).values({ actorAdminId: admin.actorAdminId, kind: 'invite', targetAdminId: admin.id })
        return row
      })
      return ok(record)
    } catch (error) {
      if (uniqueViolationConstraint(error) !== null) return err({ code: 'alreadyExists' })
      throw error
    }
  }

  async changeStatus(id: string, actorAdminId: string, decide: StatusChangeDecision): Promise<Result<AdminRecord, StatusChangeError>> {
    return this.db.transaction(async (tx): Promise<Result<AdminRecord, StatusChangeError>> => {
      // As duas linhas, em ordem de id: o lock de quem age serializa com um pedido que o desative ao mesmo tempo.
      const locked = await tx.select(COLUMNS).from(adminUsers).where(inArray(adminUsers.id, [id, actorAdminId])).orderBy(adminUsers.id).for('update')
      const actor = locked.find((row) => row.id === actorAdminId)
      if (actor === undefined || actor.disabledAt !== null) return err({ code: 'forbidden' })
      const current = locked.find((row) => row.id === id)
      if (!current) return err({ code: 'notFound', entity: 'adminUser' })
      const change = decide(current)
      if (!change.ok) return change
      const [updated] = await tx.update(adminUsers).set({ disabledAt: change.value.disabledAt }).where(eq(adminUsers.id, id)).returning(COLUMNS)
      if (!updated) throw new Error('admin update returned no row')
      const kind: AdminEventKind = change.value.disabledAt === null ? 'reactivate' : 'disable'
      await tx.insert(adminEvents).values({ actorAdminId, kind, targetAdminId: id })
      return ok(updated)
    })
  }

  async recordEvent(actorAdminId: string, kind: AdminEventKind, targetAdminId: string): Promise<void> {
    await this.db.insert(adminEvents).values({ actorAdminId, kind, targetAdminId })
  }
}
