import type { ShopCategory } from '#shared/schemas/shop'
import type { CatalogShop } from '../../shops/catalog-shop'
import type { ShopContactColumns } from '../../shops/shop-contact-columns'

/** Produto visível da vitrine + a loja e o clube ativo dela. `shop` é `null` quando o clube guardado quebra o domínio. */
export interface PublicHitRecord {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly priceCents: number | null
  readonly photoPath: string
  readonly itemContact: ShopContactColumns
  readonly shop: CatalogShop | null
}

export interface HitFeedFilter {
  /** `null` = todos os ramos. */
  readonly categories: readonly ShopCategory[] | null
  /** Id do último produto da página anterior; o repository lê dele a data de aprovação. */
  readonly after: string | null
  readonly limit: number
  readonly now: Date
}

/**
 * Visível = aprovado, com foto, dentro da validade e de loja aprovada, com o programa ativo.
 * Toda leitura devolve só o que passa nisso.
 */
export abstract class CustomerHitsRepository {
  /** Mais novo aprovado primeiro; a ordem é `approved_at desc nulls last, id desc` e `limit` já inclui a sobra da próxima página. */
  abstract listFeed(filter: HitFeedFilter): Promise<readonly PublicHitRecord[]>

  /** Produtos de destaque pago `hitsBanner` vigente (`starts_at <= now < ends_at`, não cancelado): o destaque mais antigo primeiro. */
  abstract listPaidBannerItems(now: Date, limit: number): Promise<readonly PublicHitRecord[]>

  /** O produto visível mais novo de cada loja `founderPro` aprovada fora de `excludeShopIds`; o mais novo primeiro. */
  abstract listProBannerItems(now: Date, excludeShopIds: readonly string[], limit: number): Promise<readonly PublicHitRecord[]>
}
