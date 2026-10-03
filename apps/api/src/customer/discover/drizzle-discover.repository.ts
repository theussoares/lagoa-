import { Inject, Injectable, Logger } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { BonusRulesSchema } from '#shared/schemas/program'
import { DB, type Database } from '../../database/database.module'
import { programs, shops } from '../../database/schema'
import { toProgramRules } from '../../programs/program-rules.mapper'
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
      const { mode, earnUnits, target, rewardTitle, bonusRules: rawBonusRules, ...shop } = row
      const rules = toProgramRules({ mode, earnUnits, target })
      const bonusRules = BonusRulesSchema.safeParse(rawBonusRules)
      if (!rules.ok || !bonusRules.success) {
        // Só o id vai ao log: nome e endereço não precisam sair do banco por causa de um aviso.
        this.logger.warn(`Shop ${shop.id} skipped: invalid program`)
        return []
      }
      return [{ ...shop, program: { rules: rules.value, rewardTitle, bonusRules: bonusRules.data } }]
    })
  }
}
