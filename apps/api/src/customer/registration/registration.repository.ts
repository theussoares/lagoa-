export interface NewCustomer {
  readonly userId: string
  readonly emailEncrypted: Buffer | null
  readonly emailHash: Buffer | null
  readonly phoneEncrypted: Buffer
  readonly phoneHash: Buffer
  readonly firstName: string | null
  readonly referralCode: string
}

export type RegistrationOutcome = 'created' | 'alreadyRegistered' | 'phoneTaken' | 'emailTaken' | 'referralCodeTaken'

export abstract class RegistrationRepository {
  /** Cria `app_users` e `customer_profiles` juntos ou nenhum dos dois. */
  abstract register(customer: NewCustomer): Promise<RegistrationOutcome>
}
