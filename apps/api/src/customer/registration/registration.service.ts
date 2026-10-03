import { Injectable } from '@nestjs/common'
import { CustomerIdSchema, type CustomerId } from '#shared/schemas/ids'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { parsePhoneNumber } from '#shared/utils/phone'
import { PiiService } from '../../common/pii.service'
import { generateReadableCode } from '../../common/readable-code'
import { type NewCustomer, RegistrationRepository } from './registration.repository'

export const REFERRAL_CODE_LENGTH = 8
const REFERRAL_CODE_ATTEMPTS = 5

export type RegistrationError = ErrorOf<'unauthorized' | 'invalidPhone' | 'phoneAlreadyUsed'>
export interface Registered {
  readonly customerId: CustomerId
  readonly created: boolean
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly repository: RegistrationRepository,
    private readonly pii: PiiService,
  ) {}

  /** Idempotente: repetir o cadastro da mesma conta devolve o mesmo cliente com `created: false`. */
  async register(userId: string, email: string | undefined, rawPhone: string): Promise<Result<Registered, RegistrationError>> {
    if (email === undefined) return err({ code: 'unauthorized' })
    const phone = parsePhoneNumber(rawPhone)
    if (!phone.ok) return err(phone.error)

    const customerId = CustomerIdSchema.parse(userId)
    const normalizedEmail = email.trim().toLowerCase()
    for (let attempt = 0; attempt < REFERRAL_CODE_ATTEMPTS; attempt++) {
      const customer: NewCustomer = {
        userId,
        emailEncrypted: this.pii.encrypt(normalizedEmail),
        emailHash: this.pii.hash(normalizedEmail),
        phoneEncrypted: this.pii.encrypt(phone.value),
        phoneHash: this.pii.hash(phone.value),
        referralCode: generateReadableCode(REFERRAL_CODE_LENGTH),
      }
      switch (await this.repository.register(customer)) {
        case 'created':
          return ok({ customerId, created: true })
        case 'alreadyRegistered':
          return ok({ customerId, created: false })
        case 'phoneTaken':
          return err({ code: 'phoneAlreadyUsed' })
        case 'emailTaken':
          return err({ code: 'unauthorized' })
        case 'referralCodeTaken':
          break
      }
    }
    throw new Error('Could not allocate a unique referral code')
  }
}
