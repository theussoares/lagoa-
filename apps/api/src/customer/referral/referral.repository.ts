export type CaptureOutcome =
  | 'captured'
  /** Quem chamou não tem perfil de cliente (login sem cadastro). */
  | 'noProfile'
  | 'unknownReferrer'
  | 'unknownShop'
  | 'selfReferral'
  | 'referralDisabled'
  /** Já tem cartão na loja: não é cliente novo. */
  | 'alreadyCustomer'
  | 'alreadyReferred'

export interface CaptureAttempt {
  readonly referredId: string
  readonly referralCode: string
  readonly shopCode: string
}

export abstract class ReferralRepository {
  /** Código do próprio cliente, para montar o link de convite; `null` sem perfil. */
  abstract findOwnReferralCode(customerId: string): Promise<string | null>

  /** Guarda o convite como pendente (uma indicação por loja e indicado), se todas as regras de entrada passam. */
  abstract capture(attempt: CaptureAttempt): Promise<CaptureOutcome>
}
