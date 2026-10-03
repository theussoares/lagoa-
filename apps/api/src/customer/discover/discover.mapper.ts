import { welcomeUnits } from '#shared/domain/bonusRules'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ShopSummary } from '#shared/schemas/shop'
import { ShopSummarySchema } from '#shared/schemas/shop'
import { toProgramRules } from '../../programs/program-rules.mapper'
import { shopAssetUrl } from '../../storage/shop-assets'
import type { DiscoverShop } from './discover.repository'

export function toShopSummary(shop: DiscoverShop, supabaseUrl: string): ShopSummary {
  const rules = toProgramRules(shop.program)
  return ShopSummarySchema.parse({
    id: shop.id,
    name: shop.name,
    category: shop.category,
    neighborhood: shop.neighborhood,
    addressLine: shop.addressLine,
    ...(shop.logoPath !== null && { showcase: { imageUrl: shopAssetUrl(supabaseUrl, shop.logoPath) } }),
    program: {
      unit: unitOf(rules),
      target: rules.target,
      rewardTitle: shop.program.rewardTitle,
      earnRate: earnRateOf(rules),
      welcomeUnits: welcomeUnits(shop.program.bonusRules),
    },
  })
}
