import { PILOT_COUNTRY_CODE } from '../constants/domain'

/**
 * Link que abre a conversa com o WhatsApp da loja (número público do negócio). Com `message`, o texto já vem escrito;
 * quem envia é o cliente.
 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

export function whatsappLink(phone: string, message?: string | null): string {
  const base = `https://wa.me/${PILOT_COUNTRY_CODE}${phone}`
  return message ? `${base}?text=${encodeURIComponent(message.replace(LONE_SURROGATE, '\uFFFD'))}` : base
}
