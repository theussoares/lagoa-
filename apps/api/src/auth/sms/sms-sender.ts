import type { PhoneNumber } from '#shared/schemas/phone'

/** Contrato de envio de SMS: o provedor (Comtele hoje) é detalhe de implementação. */
export abstract class SmsSender {
  /** `true` só se o provedor aceitou a mensagem. Nunca loga celular nem texto. */
  abstract send(phone: PhoneNumber, message: string): Promise<boolean>
}
