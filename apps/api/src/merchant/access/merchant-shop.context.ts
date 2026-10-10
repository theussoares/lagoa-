import type { ShopPlan, ShopStatus } from '#shared/schemas/shop'

/**
 * Quem opera o painel e qual loja. Hoje só o dono (`owner_user_id`); com equipe, o resolver passa a devolver
 * outros papéis e os services, que só conhecem este contexto, não mudam.
 */
export interface MerchantShopContext {
  readonly shopId: string
  readonly status: ShopStatus
  readonly plan: ShopPlan
  readonly role: 'owner'
  /** Versão do termo do lojista aceita (`null` = nunca aceitou). */
  readonly termsVersion: string | null
}
