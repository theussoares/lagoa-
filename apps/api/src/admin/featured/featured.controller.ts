import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { z } from 'zod'
import {
  type AdminFeaturedList,
  type AdminPlacement,
  type FeaturedAvailability,
  type FeaturedPlacementDraft,
  FeaturedPlacementDraftSchema,
  type FeaturedRangeQuery,
  FeaturedRangeQuerySchema,
} from '#shared/schemas/featured'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import type { AdminContext } from '../access/admin.context'
import { AdminSurface } from '../access/admin-surface.decorator'
import { CurrentAdmin } from '../access/current-admin.decorator'
import { AdminFeaturedService } from './featured.service'

const PlacementIdParam = new ZodValidationPipe(z.uuid())
const RangeQuery = new ZodValidationPipe(FeaturedRangeQuerySchema)

/** Destaques pagos (carrossel do Descobrir e banner do Hits): agenda, lançar e cancelar. */
@AdminSurface()
@Controller('admin/featured')
export class AdminFeaturedController {
  constructor(private readonly featured: AdminFeaturedService) {}

  @Get()
  async list(@Query(RangeQuery) query: FeaturedRangeQuery): Promise<AdminFeaturedList> {
    return this.featured.list(query)
  }

  @Get('availability')
  async availability(@Query(RangeQuery) query: FeaturedRangeQuery): Promise<FeaturedAvailability> {
    return this.featured.availability(query)
  }

  @Post()
  async create(
    @CurrentAdmin() admin: AdminContext,
    @Body(new ZodValidationPipe(FeaturedPlacementDraftSchema)) draft: FeaturedPlacementDraft,
  ): Promise<AdminPlacement> {
    return unwrap(await this.featured.create(admin, draft))
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentAdmin() admin: AdminContext, @Param('id', PlacementIdParam) id: string): Promise<AdminPlacement> {
    return unwrap(await this.featured.cancel(admin, id))
  }
}
