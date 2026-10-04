import type { BonusRules, ExpirationPolicy, ProgramRules } from '#shared/schemas/program'
import type { ShopCategory } from '#shared/schemas/shop'

/** Loja + clube já validados contra o domínio: leitura comum ao Descobrir e à Carteira. */
export interface CatalogShop {
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
    readonly expiration: ExpirationPolicy
  }
}
