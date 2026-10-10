import type { MerchantShopContext } from './merchant-shop.context'

/** Contrato: a loja que o usuário opera, sempre a partir do id do JWT, nunca de um id vindo do cliente. */
export abstract class MerchantShopResolver {
  abstract resolveForUser(userId: string): Promise<MerchantShopContext | null>
}
