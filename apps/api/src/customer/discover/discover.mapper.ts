import { welcomeUnits } from '#shared/domain/bonusRules'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import { type ShopSummary, ShopSummarySchema } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { shopAssetUrl } from '../../storage/shop-assets'
import type { DiscoverShop } from './discover.repository'

/** Valida a saída contra o contrato do `shared`: loja que não cabe nele não chega ao app. */
export function toShopSummary(shop: DiscoverShop, supabaseUrl: string): Result<ShopSummary, ErrorOf<'invalidProgram'>> {
  const { rules, rewardTitle, bonusRules } = shop.program
  const parsed = ShopSummarySchema.safeParse({
    id: shop.id,
    name: shop.name,
    category: shop.category,
    neighborhood: shop.neighborhood,
    addressLine: shop.addressLine,
    ...(shop.logoPath !== null && { showcase: { imageUrl: shopAssetUrl(supabaseUrl, shop.logoPath) } }),
    program: {
      unit: unitOf(rules),
      target: rules.target,
      rewardTitle,
      earnRate: earnRateOf(rules),
      welcomeUnits: welcomeUnits(bonusRules),
    },
  })
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidProgram' })
}
