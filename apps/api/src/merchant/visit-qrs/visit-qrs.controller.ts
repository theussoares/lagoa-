import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import {
  type IssuedVisitQr,
  type VisitQr,
  type VisitQrIssueRequest,
  VisitQrIdParamSchema,
  VisitQrIssueRequestSchema,
} from '#shared/schemas/visitQr'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { VisitQrsService } from './visit-qrs.service'
import { MerchantSurface } from '../access/merchant-surface.decorator'

@MerchantSurface()
@Controller('merchant/visit-qrs')
export class VisitQrsController {
  constructor(private readonly visitQrs: VisitQrsService) {}

  @Post()
  async issue(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(VisitQrIssueRequestSchema)) body: VisitQrIssueRequest,
  ): Promise<IssuedVisitQr> {
    return unwrap(await this.visitQrs.issueVisitQr(user.id, body))
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(VisitQrIdParamSchema)) id: string,
  ): Promise<VisitQr> {
    return unwrap(await this.visitQrs.getVisitQr(user.id, id))
  }

  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(VisitQrIdParamSchema)) id: string,
  ): Promise<VisitQr> {
    return unwrap(await this.visitQrs.cancelVisitQr(user.id, id, 'merchant'))
  }
}
