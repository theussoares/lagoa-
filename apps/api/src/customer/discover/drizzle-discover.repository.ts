import { Inject, Injectable, Logger } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { BonusRulesSchema } from '#shared/schemas/program'
import { DB, type Database } from '../../database/database.module'
import { programs, shops } from '../../database/schema'
import { type DiscoverShop, DiscoverRepository } from './discover.repository'

@Injectable()
export class DrizzleDiscoverRepository extends DiscoverRepository {
  private readonly logger = new Logger(DrizzleDiscoverRepository.name)

  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listApprovedShops(limit: number): Promise<DiscoverShop[]> {
    const rows = await this.db
      .select({
        id: shops.id,
        name: shops.name,
        category: shops.category,
        neighborhood: shops.neighborhood,
        addressLine: shops.addressLine,
        logoPath: shops.logoPath,
        mode: programs.mode,
        earnUnits: programs.earnUnits,
        target: programs.target,
        rewardTitle: programs.rewardTitle,
        bonusRules: programs.bonusRules,
      })
      .from(shops)
      .innerJoin(programs, eq(programs.shopId, shops.id))
      .where(eq(shops.status, 'approved'))
      .orderBy(asc(shops.name), asc(shops.id))
      .limit(limit)

    return rows.flatMap((row) => {
      const bonusRules = BonusRulesSchema.safeParse(row.bonusRules)
      if (!bonusRules.success) {
        // Uma loja com regra corrompida some da vitrine em vez de derrubar a lista (só o id vai ao log).
        this.logger.warn(`Shop ${row.id} skipped: invalid bonus rules`)
        return []
      }
      const { mode, earnUnits, target, rewardTitle, ...shop } = row
      return [{ ...shop, program: { mode, earnUnits, target, rewardTitle, bonusRules: bonusRules.data } }]
    })
  }
}
