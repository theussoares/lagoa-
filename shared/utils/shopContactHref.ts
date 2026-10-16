import type { ShopPublicContact } from '../schemas/shop'
import { whatsappLink } from './whatsapp'

/** Para onde o botão do card leva: a conversa do WhatsApp (com a mensagem pronta) ou o link do lojista. */
export function shopContactHref(contact: ShopPublicContact): string {
  return contact.kind === 'whatsapp' ? whatsappLink(contact.whatsapp, contact.message) : contact.url
}
