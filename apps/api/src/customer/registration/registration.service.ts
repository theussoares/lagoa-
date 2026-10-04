import { Injectable } from '@nestjs/common'
import { REFERRAL_CODE_LENGTH } from '#shared/constants/domain'
import type { CustomerSession } from '#shared/schemas/session'
import type { ErrorOf } from '#shared/types/errors'
import { err, type Result } from '#shared/types/result'
import { parsePhoneNumber } from '#shared/utils/phone'
import type { AuthUser } from '../../auth/auth.types'
import { PiiService } from '../../common/pii.service'
import { generateReadableCode } from '../../common/readable-code'
import { SessionService } from '../session/session.service'
import { type NewCustomer, RegistrationRepository } from './registration.repository'

const REFERRAL_CODE_ATTEMPTS = 5

export type RegistrationError = ErrorOf<
  'unauthorized' | 'invalidPhone' | 'phoneAlreadyUsed' | 'emailAlreadyUsed' | 'notFound'
>

@Injectable()
export class RegistrationService {
  constructor(
    private readonly repository: RegistrationRepository,
    private readonly sessions: SessionService,
    private readonly pii: PiiService,
  ) {}

  /**
   * Idempotente. Devolve sempre a sessão que o `GET /customer/session` devolveria, para o app
   * decidir sobre os termos por uma regra só (repetir o cadastro não pode pular o aceite).
   */
  async register(user: AuthUser, declaredPhone: string | undefined): Promise<Result<CustomerSession, RegistrationError>> {
    const { id: userId, email } = user
    // Celular confirmado por SMS vale mais que o digitado: ninguém "toma" o número de outra pessoa.
    if (email === undefined && user.phone === undefined) return err({ code: 'unauthorized' })
    const phone = user.phone === undefined ? parsePhoneNumber(declaredPhone ?? '') : { ok: true as const, value: user.phone }
    if (!phone.ok) return err(phone.error)

    for (let attempt = 0; attempt < REFERRAL_CODE_ATTEMPTS; attempt++) {
      const customer: NewCustomer = {
        userId,
        emailEncrypted: email === undefined ? null : this.pii.encryptEmail(email),
        emailHash: email === undefined ? null : this.pii.hashEmail(email),
        phoneEncrypted: this.pii.encrypt(phone.value),
        phoneHash: this.pii.hashPhone(phone.value),
        referralCode: generateReadableCode(REFERRAL_CODE_LENGTH),
      }
      switch (await this.repository.register(customer)) {
        case 'created':
        case 'alreadyRegistered':
          return this.sessions.current(userId)
        case 'phoneTaken':
          return err({ code: 'phoneAlreadyUsed' })
        case 'emailTaken':
          return err({ code: 'emailAlreadyUsed' })
        case 'referralCodeTaken':
          break
      }
    }
    throw new Error('Could not allocate a unique referral code')
  }
}
