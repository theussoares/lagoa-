import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'

/** O botão que chega já validado pelo schema (modo coerente, URL https pública); o banco confere de novo no CHECK. */
export function planShopContact(update: ShopContactUpdate): ShopContact {
  return { contact: update.contact }
}
