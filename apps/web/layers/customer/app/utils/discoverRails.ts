import { shopGroupOf } from '#shared/domain/shopGroup'
import type { ShopGroup } from '#shared/domain/shopGroup'
import type { ShopSummary } from '#shared/schemas/shop'
import type { Translate } from '#layers/core/app/types/i18n'
import { categoryIcon } from './categoryIcon'
import type { DiscoverRailModel, DiscoverRails, ShopRailCardModel } from '../types/discover'

type RailId = DiscoverRailModel['id']

/** O trilho de cada loja, na ordem de prioridade; `null` é o resto da vitrine. */
function railOf(shop: ShopSummary): RailId | null {
  if (shop.surpriseDayToday) return 'surpriseDay'
  if (shop.program.welcomeUnits > 0) return 'welcome'
  return null
}

/** Separa as lojas do ramo escolhido (todas, sem ramo) nos trilhos; cada loja aparece num só. */
export function buildDiscoverRails(shops: readonly ShopSummary[], group: ShopGroup | null): DiscoverRails {
  const rails: DiscoverRails = { surpriseDay: [], welcome: [], others: [] }
  for (const shop of shops) {
    if (group !== null && shopGroupOf(shop.category) !== group) continue
    rails[railOf(shop) ?? 'others'].push(shop)
  }
  return rails
}

function sealOf(shop: ShopSummary, t: Translate): string | null {
  switch (railOf(shop)) {
    case 'surpriseDay':
      return t('discover.rails.surpriseDaySeal')
    case 'welcome':
      return t('discover.rails.welcomeSeal', { count: shop.program.welcomeUnits })
    case null:
      return null
  }
}

export function toShopRailCardModel(shop: ShopSummary, t: Translate, featured: { sponsored: boolean } = { sponsored: false }): ShopRailCardModel {
  return {
    id: shop.id,
    shopName: shop.name,
    meta: `${t(`discover.groups.${shopGroupOf(shop.category)}`)} · ${shop.neighborhood}`,
    image: shop.showcase?.imageUrl ?? null,
    icon: categoryIcon(shop.category),
    badge: featured.sponsored ? t('discover.featuredBadge') : null,
    seal: sealOf(shop, t),
  }
}

/** Trilhos com loja, na ordem da tela; trilho vazio some. */
export function toDiscoverRailModels(rails: DiscoverRails, t: Translate): DiscoverRailModel[] {
  const models: DiscoverRailModel[] = [
    { id: 'surpriseDay', title: t('discover.rails.surpriseDay'), lead: t('discover.rails.surpriseDayLead'), cards: rails.surpriseDay.map((shop) => toShopRailCardModel(shop, t)) },
    { id: 'welcome', title: t('discover.rails.welcome'), lead: t('discover.rails.welcomeLead'), cards: rails.welcome.map((shop) => toShopRailCardModel(shop, t)) },
  ]
  return models.filter((rail) => rail.cards.length > 0)
}
