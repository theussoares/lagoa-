import type { ShopContact } from '#shared/schemas/shop'

export abstract class ShopContactRepository {
  abstract find(shopId: string): Promise<ShopContact | null>
  /** Grava e devolve o contato como ficou; `null` se a loja não existe. */
  abstract replace(shopId: string, contact: ShopContact): Promise<ShopContact | null>
}
