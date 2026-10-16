import type { ShopPublicContact } from '../schemas/shop'
import { whatsappLink } from './whatsapp'

/** Ícone do botão do card: um por modo, o mesmo no painel (prévia) e no card do cliente. */
export function shopContactIcon(contact: ShopPublicContact): string {
  return contact.kind === 'whatsapp' ? 'i-ph-whatsapp-logo' : 'i-ph-arrow-square-out'
}

/** Para onde o botão do card leva: a conversa do WhatsApp (com a mensagem pronta) ou o link do lojista. */
export function shopContactHref(contact: ShopPublicContact): string {
  return contact.kind === 'whatsapp' ? whatsappLink(contact.whatsapp, contact.message) : contact.url
}
