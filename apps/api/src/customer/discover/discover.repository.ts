import type { CatalogShop } from '../../shops/catalog-shop'

/** Loja do carrossel e se ela está lá por destaque pago. */
export interface FeaturedCatalogShop {
  readonly shop: CatalogShop
  readonly sponsored: boolean
}

export abstract class DiscoverRepository {
  /**
   * Só lojas aprovadas, com o clube; ordem estável (nome, id) e sempre limitada. Loja cujo clube
   * não passa nas regras do domínio fica de fora, em vez de derrubar a vitrine.
   */
  abstract listApprovedShops(limit: number): Promise<CatalogShop[]>

  /**
   * Carrossel: lojas aprovadas com destaque `discoverCarousel` vigente (`starts_at <= now < ends_at`, não cancelado) primeiro,
   * depois as `founderPro` aprovadas sem repetir. Em cada grupo a ordem gira por dia (`md5(id || day)`), igual o dia todo.
   */
  abstract listFeaturedShops(now: Date, day: string, limit: number): Promise<FeaturedCatalogShop[]>
}
