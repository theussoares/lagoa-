import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { z } from 'zod'
import {
  type AdminHitItem,
  type AdminHitItemList,
  type AdminHitItemListQuery,
  AdminHitItemListQuerySchema,
  type HitItemReview,
  HitItemReviewSchema,
} from '#shared/schemas/admin'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import type { AdminContext } from '../access/admin.context'
import { AdminSurface } from '../access/admin-surface.decorator'
import { CurrentAdmin } from '../access/current-admin.decorator'
import { AdminHitsService } from './hits.service'

const ItemIdParam = new ZodValidationPipe(z.uuid())

/** Moderação dos produtos do Hits: fila, vitrine e as três decisões (aprovar, recusar, tirar do ar). */
@AdminSurface()
@Controller('admin/hits')
export class AdminHitsController {
  constructor(private readonly hits: AdminHitsService) {}

  @Get()
  async list(@Query(new ZodValidationPipe(AdminHitItemListQuerySchema)) query: AdminHitItemListQuery): Promise<AdminHitItemList> {
    return this.hits.list(query)
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async review(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', ItemIdParam) id: string,
    @Body(new ZodValidationPipe(HitItemReviewSchema)) review: HitItemReview,
  ): Promise<AdminHitItem> {
    return unwrap(await this.hits.review(admin, id, review))
  }
}
