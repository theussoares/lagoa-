import { type CanActivate, type ExecutionContext, Injectable, UseGuards, applyDecorators } from '@nestjs/common'
import { TERMS_VERSION } from '#shared/constants/domain'
import type { AuthenticatedRequest } from '../../auth/auth.types'
import { DomainException } from '../../common/http/domain-exception'
import { ProfileRepository } from './profile.repository'
import { hasAcceptedTerms } from './profile.rules'

/**
 * Visita, resgate e convite só valem para quem aceitou a versão atual dos termos: o app mostra a tela, mas
 * quem decide é o servidor. Roda depois do guard de autenticação (que preenche `request.user`).
 */
@Injectable()
export class TermsGuard implements CanActivate {
  constructor(private readonly profiles: ProfileRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const terms = await this.profiles.findTerms(user.id)
    // Sem perfil: cada rota já responde do seu jeito (cadastro pendente); aqui só se barra quem tem perfil sem aceite.
    if (terms !== null && !hasAcceptedTerms(terms, TERMS_VERSION)) throw new DomainException({ code: 'termsNotAccepted' })
    return true
  }
}

export const RequiresTerms = (): MethodDecorator & ClassDecorator => applyDecorators(UseGuards(TermsGuard))
