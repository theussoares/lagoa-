import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'

/** Sem WhatsApp não há botão: o texto do botão não fica guardado sozinho (o CHECK do banco também exige). */
export function planShopContact(update: ShopContactUpdate): ShopContact {
  return update.whatsapp === null ? { whatsapp: null, ctaLabel: null } : { whatsapp: update.whatsapp, ctaLabel: update.ctaLabel }
}
