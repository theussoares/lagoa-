import { randomUUID } from 'node:crypto'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { eq, or } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { adminEvents, adminUsers } from '../../database/schema'
import { FakeAdminAuth } from '../../test-support/fake-admin-auth'
import { createTestPii } from '../../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { AdminGuard } from '../access/admin.guard'
import { DrizzleAdminUsersReader } from '../access/drizzle-admin-users.reader'
import { DrizzleAdminTeamRepository } from './drizzle-team.repository'
import { AdminTeamService } from './team.service'

describe.skipIf(!TEST_DATABASE_URL)('admin team against a real database', () => {
  let data: TestDatabase
  let service: AdminTeamService
  let guard: AdminGuard
  let auth: FakeAdminAuth
  let actor: { adminId: string }
  const pii = createTestPii()
  // E-mail novo a cada execução: o pepper do teste é fixo e uma linha de outra rodada poderia sobrar.
  const freshEmail = (): string => `admin-${randomUUID()}@rede.test`

  /** O mesmo `AdminGuard` das rotas, com o leitor do banco: diz se um token de admin com MFA ainda passa. */
  const passesGuard = async (adminId: string): Promise<boolean> => {
    const context = new ExecutionContextHost([{ user: { id: adminId, email: undefined, phone: undefined, role: 'admin', aal: 'aal2' } }])
    return guard.canActivate(context).catch(() => false)
  }
  const eventsOf = (adminId: string) =>
    data.db
      .select({ actor: adminEvents.actorAdminId, kind: adminEvents.kind, target: adminEvents.targetAdminId })
      .from(adminEvents)
      .where(or(eq(adminEvents.actorAdminId, adminId), eq(adminEvents.targetAdminId, adminId)))
      .orderBy(adminEvents.createdAt, adminEvents.id)

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    guard = new AdminGuard(new DrizzleAdminUsersReader(data.db))
    // E-mail cifrado de verdade: a lista decifra cada linha.
    const actorEmail = freshEmail()
    actor = { adminId: (await data.createAdminUser({ name: 'Ana da Rede', emailEncrypted: pii.encryptEmail(actorEmail), emailHash: pii.hashEmail(actorEmail) })).id }
  })
  beforeEach(() => {
    auth = new FakeAdminAuth()
    service = new AdminTeamService(new DrizzleAdminTeamRepository(data.db), auth, pii, new SystemClock())
  })
  afterAll(async () => data.close())

  async function invite(email = freshEmail()): Promise<string> {
    const invited = await service.invite(actor, { name: 'Bia da Rede', email })
    if (!invited.ok) throw new Error(`invite failed: ${invited.error.code}`)
    data.trackAdmin(invited.value.id)
    return invited.value.id
  }

  it('invites: writes admin_users (e-mail encrypted and hashed) and admin_events(kind=invite) by the actor', async () => {
    const email = freshEmail()
    const id = await invite(email.toUpperCase())
    const [row] = await data.db.select().from(adminUsers).where(eq(adminUsers.id, id))
    expect(row).toMatchObject({ name: 'Bia da Rede', invitedBy: actor.adminId, disabledAt: null })
    expect(row?.emailHash.equals(pii.hashEmail(email))).toBe(true)
    expect(pii.decrypt(row?.emailEncrypted ?? Buffer.alloc(0))).toBe(email)
    expect(await eventsOf(id)).toEqual([{ actor: actor.adminId, kind: 'invite', target: id }])
    expect(auth.invited).toEqual([{ email, name: 'Bia da Rede', userId: id }])
  })

  it('refuses the e-mail of a disabled admin with alreadyExists, without calling Supabase', async () => {
    const email = freshEmail()
    const id = await invite(email)
    expect((await service.disable(actor, id)).ok).toBe(true)
    auth.invited.length = 0
    expect(await service.invite(actor, { name: 'Outra', email })).toEqual({ ok: false, error: { code: 'alreadyExists' } })
    expect(auth.invited).toEqual([])
  })

  it('disabled stops passing the AdminGuard; reactivated passes again; both recorded', async () => {
    const id = await invite()
    expect(await passesGuard(id)).toBe(true)
    const disabled = await service.disable(actor, id)
    expect(disabled.ok && disabled.value.disabledAt).toEqual(expect.any(String))
    expect(await passesGuard(id)).toBe(false)
    const reactivated = await service.reactivate(actor, id)
    expect(reactivated.ok && reactivated.value.disabledAt).toBeNull()
    expect(await passesGuard(id)).toBe(true)
    expect((await eventsOf(id)).map((event) => event.kind)).toEqual(['invite', 'disable', 'reactivate'])
  })

  it('refuses disabling or resetting the MFA of oneself with forbidden, changing nothing', async () => {
    expect(await service.disable(actor, actor.adminId)).toEqual({ ok: false, error: { code: 'forbidden' } })
    expect(await service.resetMfa(actor, actor.adminId)).toEqual({ ok: false, error: { code: 'forbidden' } })
    expect(await passesGuard(actor.adminId)).toBe(true)
    expect(auth.mfaResets).toEqual([])
    expect((await eventsOf(actor.adminId)).filter((event) => event.target === actor.adminId)).toEqual([])
  })

  it('resets the MFA of someone else and records it; a failed reset records nothing', async () => {
    const id = await invite()
    auth.mfaFailure = { code: 'network' }
    expect(await service.resetMfa(actor, id)).toEqual({ ok: false, error: { code: 'network' } })
    auth.mfaFailure = null
    expect((await service.resetMfa(actor, id)).ok).toBe(true)
    expect(auth.mfaResets).toEqual([id])
    expect((await eventsOf(id)).map((event) => event.kind)).toEqual(['invite', 'resetMfa'])
  })

  it('answers notFound for someone outside the team', async () => {
    expect(await service.disable(actor, randomUUID())).toEqual({ ok: false, error: { code: 'notFound', entity: 'adminUser' } })
    expect(await service.resetMfa(actor, randomUUID())).toEqual({ ok: false, error: { code: 'notFound', entity: 'adminUser' } })
  })

  // Pelo repository: o banco de teste é compartilhado e pode ter linhas de outra rodada com bytes que esta chave não
  // decifra. A decifração da lista está coberta no teste HTTP.
  it('lists the team oldest first, including who was just invited', async () => {
    const email = freshEmail()
    const id = await invite(email)
    const team = await new DrizzleAdminTeamRepository(data.db).list(1_000)
    const invited = team.find((member) => member.id === id)
    expect(invited).toMatchObject({ name: 'Bia da Rede', disabledAt: null })
    expect(pii.decrypt(invited?.emailEncrypted ?? Buffer.alloc(0))).toBe(email)
    const createdAts = team.map((member) => member.createdAt.getTime())
    expect(createdAts).toEqual([...createdAts].sort((a, b) => a - b))
  })

  it('bootstraps the first admin as its own actor, with nobody as inviter', async () => {
    const created = await service.bootstrap({ name: 'Dona da Rede', email: freshEmail() })
    if (!created.ok) throw new Error('bootstrap failed')
    data.trackAdmin(created.value.id)
    const [row] = await data.db.select({ invitedBy: adminUsers.invitedBy }).from(adminUsers).where(eq(adminUsers.id, created.value.id))
    expect(row?.invitedBy).toBeNull()
    expect(await eventsOf(created.value.id)).toEqual([{ actor: created.value.id, kind: 'invite', target: created.value.id }])
  })
})
