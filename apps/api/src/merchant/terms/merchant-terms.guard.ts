import { applyDecorators, type CanActivate, type ExecutionContext, Inject, Injectable, UseGuards } from '@nestjs/common'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { DomainException } from '../../common/http/domain-exception'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import type { MerchantRequest } from '../access/merchant-shop.guard'

/**
 * Emitir QR, validar/confirmar resgate e campanha só valem com o termo do lojista aceito (a versão atual): o painel
 * mostra o aceite, mas quem decide é o servidor. Roda depois do `MerchantShopGuard`, que preenche `request.merchantShop`.
 * Desligado por padrão (`MERCHANT_TERMS_REQUIRED=0`) até o texto do jurídico existir.
 */
@Injectable()
export class MerchantTermsGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'MERCHANT_TERMS_REQUIRED'>) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.env.MERCHANT_TERMS_REQUIRED !== '1') return true
    const shop = context.switchToHttp().getRequest<MerchantRequest>().merchantShop
    if (!shop || shop.termsVersion !== MERCHANT_TERMS_VERSION) throw new DomainException({ code: 'merchantTermsNotAccepted' })
    return true
  }
}

export const RequiresMerchantTerms = (): MethodDecorator & ClassDecorator => applyDecorators(UseGuards(MerchantTermsGuard))
