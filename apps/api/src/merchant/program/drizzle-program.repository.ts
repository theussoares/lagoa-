import { Inject, Injectable } from '@nestjs/common'
import { and, count, eq } from 'drizzle-orm'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import { DB, type Database } from '../../database/database.module'
import { loyaltyCards, programs, shops } from '../../database/schema'
import { toProgram } from '../../programs/program-rules.mapper'
import { ProgramRepository, type ActiveProgramData } from './program.repository'
import { mapDraftToProgramInsert } from './program.rules'

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

  async saveProgram(
    shopId: string,
    currentProgramId: string,
    draft: ProgramDraft,
    isNewVersion: boolean,
  ): Promise<Program> {
    if (isNewVersion) {
      return this.db.transaction(async (tx) => {
        await tx
          .update(programs)
          .set({ active: false })
          .where(and(eq(programs.shopId, shopId), eq(programs.id, currentProgramId)))

        const insertValues = mapDraftToProgramInsert(shopId, draft)
        const [inserted] = await tx
          .insert(programs)
          .values(insertValues)
          .returning()

        if (!inserted) {
          throw new Error('Failed to insert new program version')
        }

        const mapped = toProgram(inserted)
        if (!mapped.ok) {
          throw new Error('Inserted program row violated domain rules')
        }

        return mapped.value
      })
    }

    const [updated] = await this.db
      .update(programs)
      .set({
        rewardTitle: draft.reward.title,
        updatedAt: new Date(),
      })
      .where(and(eq(programs.shopId, shopId), eq(programs.id, currentProgramId)))
      .returning()

    if (!updated) {
      throw new Error('Failed to update active program')
    }

    const mapped = toProgram(updated)
    if (!mapped.ok) {
      throw new Error('Updated program row violated domain rules')
    }

    return mapped.value
  }
}
