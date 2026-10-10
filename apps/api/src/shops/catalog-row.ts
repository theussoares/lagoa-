import { Logger } from '@nestjs/common'
import { BonusRulesSchema, type ProgramMode } from '#shared/schemas/program'
import type { ShopCategory } from '#shared/schemas/shop'
import { programs, shops } from '../database/schema'
import { toExpirationPolicy, toProgramRules } from '../programs/program-rules.mapper'
import type { CatalogShop } from './catalog-shop'

/** Colunas de `shops` + `programs` que formam um `CatalogShop`; entram em qualquer select com join. */
export const CATALOG_COLUMNS = {
  shopId: shops.id,
  name: shops.name,
  category: shops.category,
  neighborhood: shops.neighborhood,
  addressLine: shops.addressLine,
  logoPath: shops.logoPath,
  bannerPath: shops.bannerPath,
  mode: programs.mode,
  earnUnits: programs.earnUnits,
  target: programs.target,
  rewardTitle: programs.rewardTitle,
  bonusRules: programs.bonusRules,
  expirationKind: programs.expirationKind,
  expirationMonths: programs.expirationMonths,
}

export interface CatalogRow {
  readonly shopId: string
  readonly name: string
  readonly category: ShopCategory
  readonly neighborhood: string
  readonly addressLine: string
  readonly logoPath: string | null
  readonly bannerPath: string | null
  readonly mode: ProgramMode
  readonly earnUnits: number
  readonly target: number
  readonly rewardTitle: string
  readonly bonusRules: unknown
  readonly expirationKind: 'never' | 'afterInactivity'
  readonly expirationMonths: number | null
}

const logger = new Logger('ShopCatalog')

/**
 * Dado vindo do banco entra no app só validado. Clube fora das regras do domínio vira `null`
 * (quem chama pula a linha em vez de derrubar a lista); só o id vai ao log.
 */
export function toCatalogShop(row: CatalogRow): CatalogShop | null {
  const rules = toProgramRules(row)
  const bonusRules = BonusRulesSchema.safeParse(row.bonusRules)
  const expiration = toExpirationPolicy(row)
  if (!rules.ok || !bonusRules.success || !expiration.ok) {
    logger.warn(`Shop ${row.shopId} skipped: invalid program`)
    return null
  }
  return {
    id: row.shopId,
    name: row.name,
    category: row.category,
    neighborhood: row.neighborhood,
    addressLine: row.addressLine,
    logoPath: row.logoPath,
    bannerPath: row.bannerPath,
    program: { rules: rules.value, rewardTitle: row.rewardTitle, bonusRules: bonusRules.data, expiration: expiration.value },
  }
}
