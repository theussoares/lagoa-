import type { ShopSummary } from '#shared/schemas/shop'
import { shopContactHref } from '#shared/utils/shopContactHref'
import type { ExternalLinkModel } from '#layers/ui/app/types/discover'
import type { Translate } from '#layers/core/app/types/i18n'

/** Botão do card (WhatsApp com a mensagem pronta, ou o link do lojista): o texto é o que a loja cadastrou, ou o padrão do WhatsApp. `null` sem botão. */
export function shopContactLink(shop: Pick<ShopSummary, 'name' | 'contact'>, t: Translate): ExternalLinkModel | null {
  if (shop.contact === undefined) return null
  const { contact } = shop
  const label = contact.ctaLabel ?? t('shopContact.defaultLabel')
  const isWhatsapp = contact.kind === 'whatsapp'
  return {
    label,
    accessibleLabel: t(isWhatsapp ? 'shopContact.accessibleLabel' : 'shopContact.accessibleLabelUrl', { label, shop: shop.name }),
    href: shopContactHref(contact),
    icon: isWhatsapp ? 'i-ph-whatsapp-logo' : 'i-ph-arrow-square-out',
  }
}
