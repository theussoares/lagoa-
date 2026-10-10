import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { ShopPoster, ShopStatus } from '#shared/schemas/shop'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { MerchantSurface } from '../access/merchant-surface.decorator'
import { ClubSetupService } from './club-setup.service'

/** Cartaz, situação da loja e aviso do cartaz novo: tudo da loja do dono, que o guard já resolveu. */
@MerchantSurface()
@Controller('merchant')
export class ShopController {
  constructor(private readonly setup: ClubSetupService) {}

  @Get('poster')
  async getPoster(@CurrentUser() user: AuthUser): Promise<ShopPoster> {
    return unwrap(await this.setup.getPoster(user.id))
  }

  @Get('shop/status')
  async getStatus(@CurrentUser() user: AuthUser): Promise<{ status: ShopStatus }> {
    return { status: unwrap(await this.setup.getStatus(user.id)) }
  }

  /** Atrás de `ENABLE_TEST_APPROVE`: só ambiente de teste aprova pelo app; em produção a rede aprova pelo script. */
  @Post('shop/test-approve')
  async testApprove(@CurrentUser() user: AuthUser): Promise<{ status: ShopStatus }> {
    return { status: unwrap(await this.setup.testApprove(user.id)) }
  }

  @Get('shop/poster-reprint')
  async posterReprint(@CurrentUser() user: AuthUser): Promise<{ pending: boolean }> {
    return { pending: unwrap(await this.setup.isPosterReprintPending(user.id)) }
  }

  @Post('shop/poster-reprint/printed')
  @HttpCode(HttpStatus.OK)
  async posterPrinted(@CurrentUser() user: AuthUser): Promise<{ pending: boolean }> {
    return { pending: unwrap(await this.setup.markPosterReprinted(user.id)) }
  }
}
