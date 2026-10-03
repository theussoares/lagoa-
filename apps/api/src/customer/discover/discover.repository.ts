import type { BonusRules, ProgramRules } from '#shared/schemas/program'
import type { ShopCategory } from '#shared/schemas/shop'

export interface DiscoverShop {
  readonly id: string
  readonly name: string
  readonly category: ShopCategory
  readonly neighborhood: string
  readonly addressLine: string
  readonly logoPath: string | null
  readonly program: {
    readonly rules: ProgramRules
    readonly rewardTitle: string
    readonly bonusRules: BonusRules
  }
}

export abstract class DiscoverRepository {
  /**
   * Só lojas aprovadas, com o clube; ordem estável (nome, id) e sempre limitada. Loja cujo clube
   * não passa nas regras do domínio fica de fora, em vez de derrubar a vitrine.
   */
  abstract listApprovedShops(limit: number): Promise<DiscoverShop[]>
}
