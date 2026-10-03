import type { CatalogShop } from '../../shops/catalog-shop'

export abstract class DiscoverRepository {
  /**
   * Só lojas aprovadas, com o clube; ordem estável (nome, id) e sempre limitada. Loja cujo clube
   * não passa nas regras do domínio fica de fora, em vez de derrubar a vitrine.
   */
  abstract listApprovedShops(limit: number): Promise<CatalogShop[]>
}
