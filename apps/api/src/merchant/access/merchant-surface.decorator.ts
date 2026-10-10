import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { MerchantShopGuard } from './merchant-shop.guard'

export const MERCHANT_SURFACE = 'merchantSurface'

export interface MerchantSurfaceOptions {
  /** `false` só em quem ainda pode não ter loja (sessão e Criar o clube). */
  readonly shopRequired?: boolean
}

/** Obrigatório em todo controller do painel: um teste varre o `MerchantModule` e falha se faltar. */
export const MerchantSurface = (options: MerchantSurfaceOptions = {}): ClassDecorator =>
  applyDecorators(UseGuards(MerchantShopGuard), SetMetadata(MERCHANT_SURFACE, { shopRequired: options.shopRequired ?? true }))
