import { Injectable } from '@nestjs/common'
import { TERMS_VERSION } from '#shared/constants/domain'
import { CustomerIdSchema } from '#shared/schemas/ids'
import type { CustomerSession } from '#shared/schemas/session'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ProfileRepository } from '../profile/profile.repository'
import { hasAcceptedTerms } from '../profile/profile.rules'

@Injectable()
export class SessionService {
  constructor(private readonly profiles: ProfileRepository) {}

  /** `notFound` = login válido sem cadastro: o app manda para o cadastro. "Novo" = ainda não aceitou a versão atual dos termos (o app mostra a tela de termos). */
  async current(userId: string): Promise<Result<CustomerSession, ErrorOf<'notFound'>>> {
    const profile = await this.profiles.findByUserId(userId)
    if (profile === null) return err({ code: 'notFound', entity: 'customer' })
    return ok({
      role: 'customer',
      customerId: CustomerIdSchema.parse(profile.userId),
      isNewCustomer: !hasAcceptedTerms(profile, TERMS_VERSION),
    })
  }
}
