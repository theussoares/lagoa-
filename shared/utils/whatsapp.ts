import { PILOT_COUNTRY_CODE } from '../constants/domain'

/** Link que abre a conversa com o WhatsApp da loja (número público do negócio, sem mensagem pronta). */
export function whatsappLink(phone: string): string {
  return `https://wa.me/${PILOT_COUNTRY_CODE}${phone}`
}
