import { Inject, Injectable } from '@nestjs/common'
import { and, count, eq, gt, lt, lte } from 'drizzle-orm'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { loyaltyCards, programs, shops, visitQrs } from '../../database/schema'
import { toProgram } from '../../programs/program-rules.mapper'
import { ProgramRepository, type ActiveProgramData } from './program.repository'
import { mapDraftToProgramInsert } from './program.rules'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]

@Injectable()
export class DrizzleProgramRepository extends ProgramRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findActiveProgramByOwner(ownerUserId: string): Promise<ActiveProgramData | null> {
    const [row] = await this.db
      .select({
        shopId: shops.id,
        id: programs.id,
        rewardTitle: programs.rewardTitle,
        mode: programs.mode,
        earnUnits: programs.earnUnits,
        target: programs.target,
        bonusRules: programs.bonusRules,
        expirationKind: programs.expirationKind,
        expirationMonths: programs.expirationMonths,
        checkInEnabled: programs.checkInEnabled,
        checkInCooldownHours: programs.checkInCooldownHours,
      })
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(eq(shops.ownerUserId, ownerUserId))
      .limit(1)

    if (!row) {
      return null
    }

    const mapped = toProgram(row)
    if (!mapped.ok) {
      throw new Error(`Active program row ${row.id} violated domain rules`)
    }

    return {
      shopId: row.shopId,
      program: mapped.value,
    }
  }

  async countCardsByShopId(shopId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.shopId, shopId))

    return Number(row?.count ?? 0)
  }

  async updateActiveProgram(
    ownerUserId: string,
    draft: ProgramDraft,
    decide: (current: Program) => { isNewVersion: boolean },
    now: Date,
  ): Promise<Result<Program, ErrorOf<'notFound'>>> {
    return this.db.transaction(async (tx) => {
      // O FK de loyalty_cards pede KEY SHARE nesta linha: cartão novo espera a troca terminar.
      const [shop] = await tx
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.ownerUserId, ownerUserId))
        .for('update')
      if (!shop) return err({ code: 'notFound', entity: 'program' })

      const [row] = await tx
        .select()
        .from(programs)
        .where(and(eq(programs.shopId, shop.id), eq(programs.active, true)))
        .limit(1)
      if (!row) return err({ code: 'notFound', entity: 'program' })

      const current = toProgram(row)
      if (!current.ok) throw new Error(`Active program row ${row.id} violated domain rules`)

      const decision = decide(current.value)
      const saved = decision.isNewVersion
        ? await this.insertNewVersion(tx, shop.id, row, draft, now)
        : await this.updateRewardTitle(tx, shop.id, row.id, draft)
      return ok(saved)
    })
  }

  private async insertNewVersion(tx: Tx, shopId: string, previous: typeof programs.$inferSelect, draft: ProgramDraft, now: Date): Promise<Program> {
    const currentProgramId = previous.id
    await tx
      .update(programs)
      .set({ active: false })
      .where(and(eq(programs.shopId, shopId), eq(programs.id, currentProgramId)))

    // Só o que ainda está vivo vira `programChanged` (o cliente com ele na mão ouve "tire outro"); o que já passou
    // do prazo apenas vence, sem inventar um cancelamento que ninguém fez.
    await tx
      .update(visitQrs)
      .set({ status: 'cancelled', cancelReason: 'programChanged' })
      .where(and(eq(visitQrs.shopId, shopId), eq(visitQrs.status, 'active'), gt(visitQrs.expiresAt, now)))
    await tx
      .update(visitQrs)
      .set({ status: 'expired' })
      .where(and(eq(visitQrs.shopId, shopId), eq(visitQrs.status, 'active'), lte(visitQrs.expiresAt, now)))

    const [inserted] = await tx.insert(programs).values(mapDraftToProgramInsert(shopId, draft)).returning()
    if (!inserted) throw new Error('Failed to insert new program version')
    await this.carryPointsOutOfPerRealMode(tx, shopId, previous, inserted)

    const mapped = toProgram(inserted)
    if (!mapped.ok) throw new Error('Inserted program row violated domain rules')
    return mapped.value
  }

  /**
   * Cartão em pontos por real não rende com QR sem valor, e o QR de um modo por visita nunca tem valor: se o cartão
   * ficasse na versão antiga, nunca mais andaria (nem chegaria ao resgate, onde trocaria de versão). Quando a unidade
   * é a mesma (ponto), o saldo atravessa a troca. Cartão que já bate a meta nova fica de fora: o prêmio dele segue
   * valendo na versão em que foi ganho.
   */
  private async carryPointsOutOfPerRealMode(tx: Tx, shopId: string, previous: typeof programs.$inferSelect, next: typeof programs.$inferSelect): Promise<void> {
    if (previous.earnPer !== 'real' || next.earnPer === 'real' || previous.unit !== next.unit) return
    await tx
      .update(loyaltyCards)
      .set({ programId: next.id, rewardExpiresAt: null })
      .where(and(eq(loyaltyCards.shopId, shopId), eq(loyaltyCards.programId, previous.id), gt(loyaltyCards.balance, 0), lt(loyaltyCards.balance, next.target)))
  }

  private async updateRewardTitle(tx: Tx, shopId: string, currentProgramId: string, draft: ProgramDraft): Promise<Program> {
    const [updated] = await tx
      .update(programs)
      .set({ rewardTitle: draft.reward.title, updatedAt: new Date() })
      .where(and(eq(programs.shopId, shopId), eq(programs.id, currentProgramId)))
      .returning()
    if (!updated) throw new Error('Failed to update active program')

    const mapped = toProgram(updated)
    if (!mapped.ok) throw new Error('Updated program row violated domain rules')
    return mapped.value
  }
}
