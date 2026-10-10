import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ClubSetupDraftSchema, type ClubSetupDraft } from '#shared/schemas/onboarding'
import type { MerchantSession } from '#shared/schemas/session'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { MerchantSurface } from '../access/merchant-surface.decorator'
import { ClubSetupService } from './club-setup.service'

/** Única rota do painel que roda sem loja: é ela que cria a loja. */
@MerchantSurface({ shopRequired: false })
@Controller('merchant')
export class ClubSetupController {
  constructor(private readonly setup: ClubSetupService) {}

  /** 201 quando cria; 200 com a loja existente quando o dono repete a chamada (o rascunho novo não é aplicado). */
  @Post('club-setup')
  async createClub(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ClubSetupDraftSchema)) draft: ClubSetupDraft,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MerchantSession> {
    const { session, created } = unwrap(await this.setup.createClub(user, draft))
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK)
    return session
  }
}
