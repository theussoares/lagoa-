import { welcomeUnits } from '#shared/domain/bonusRules'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import { type ShopSummary, ShopSummarySchema } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { shopAssetUrl } from '../storage/shop-assets'
import type { CatalogShop } from './catalog-shop'

/** Valida a saída contra o contrato do `shared`: loja que não cabe nele não chega ao app. */
/** Banner na capa e logo no círculo do card; sem nenhuma das duas, o card não leva `showcase` de imagem. */
function showcaseOf(shop: CatalogShop, supabaseUrl: string): { showcase?: { imageUrl?: string; logoUrl?: string } } {
  const showcase = {
    ...(shop.bannerPath !== null && { imageUrl: shopAssetUrl(supabaseUrl, shop.bannerPath) }),
    ...(shop.logoPath !== null && { logoUrl: shopAssetUrl(supabaseUrl, shop.logoPath) }),
  }
  return Object.keys(showcase).length === 0 ? {} : { showcase }
}

export function toShopSummary(shop: CatalogShop, supabaseUrl: string): Result<ShopSummary, ErrorOf<'invalidProgram'>> {
  const { rules, rewardTitle, bonusRules } = shop.program
  const parsed = ShopSummarySchema.safeParse({
    id: shop.id,
    name: shop.name,
    category: shop.category,
    neighborhood: shop.neighborhood,
    addressLine: shop.addressLine,
    ...showcaseOf(shop, supabaseUrl),
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
