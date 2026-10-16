import type { PhoneNumber } from '#shared/schemas/phone'

/** `throttled` = o provedor recusou por excesso de envios a este número; o usuário precisa esperar. */
export type OtpSendResult = 'sent' | 'throttled' | 'failed'

/** Contrato de entrega do código de login: o canal (WhatsApp hoje) é detalhe de implementação. */
export abstract class OtpSender {
  /** Recebe só o código: o texto é do template do provedor. Nunca loga celular nem código. */
  abstract send(phone: PhoneNumber, code: string): Promise<OtpSendResult>
}
