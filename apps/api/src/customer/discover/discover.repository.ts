import type { BonusRules, ProgramMode } from '#shared/schemas/program'
import type { ShopCategory } from '#shared/schemas/shop'

export interface DiscoverShop {
  readonly id: string
  readonly name: string
  readonly category: ShopCategory
  readonly neighborhood: string
  readonly addressLine: string
  readonly logoPath: string | null
  readonly program: {
    readonly mode: ProgramMode
    readonly earnUnits: number
    readonly target: number
    readonly rewardTitle: string
    readonly bonusRules: BonusRules
  }
}

export abstract class DiscoverRepository {
  /** Só lojas aprovadas, com o clube; ordem estável (nome, id) e sempre limitada. */
  abstract listApprovedShops(limit: number): Promise<DiscoverShop[]>
}
