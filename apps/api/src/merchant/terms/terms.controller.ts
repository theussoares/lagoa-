import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { z } from 'zod'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { Clock } from '../../common/clock'
import { DomainException } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { MerchantSurface } from '../access/merchant-surface.decorator'
import { MerchantTermsRepository } from './terms.repository'

const AcceptBodySchema = z.object({ version: z.string().min(1).max(64) })

/** Aceite do termo do lojista: o app manda a versão que mostrou; só vale a atual (texto novo, aceite novo). */
@MerchantSurface()
@Controller('merchant/shop/terms')
export class MerchantTermsController {
  constructor(
    private readonly terms: MerchantTermsRepository,
    private readonly clock: Clock,
  ) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async accept(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(AcceptBodySchema)) body: z.infer<typeof AcceptBodySchema>): Promise<{ version: string }> {
    if (body.version !== MERCHANT_TERMS_VERSION) throw new DomainException({ code: 'merchantTermsNotAccepted' })
    if (!(await this.terms.accept(user.id, body.version, this.clock.now()))) throw new DomainException({ code: 'notFound', entity: 'shop' })
    return { version: body.version }
  }
}
