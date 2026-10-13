import type { ShopSummary } from '#shared/schemas/shop'
import { whatsappLink } from '#shared/utils/whatsapp'
import type { ExternalLinkModel } from '#layers/ui/app/types/discover'
import type { Translate } from '#layers/core/app/types/i18n'

/** Botão de WhatsApp do card: o texto é o que a loja cadastrou ("Agendar agora"), ou o padrão. `null` sem WhatsApp. */
export function shopContactLink(shop: Pick<ShopSummary, 'name' | 'contact'>, t: Translate): ExternalLinkModel | null {
  if (shop.contact === undefined) return null
  const label = shop.contact.ctaLabel ?? t('shopContact.defaultLabel')
  return {
    label,
    accessibleLabel: t('shopContact.accessibleLabel', { label, shop: shop.name }),
    href: whatsappLink(shop.contact.whatsapp),
  }
}
