import { Controller, Get, Query } from '@nestjs/common'
import { type HitsBanner, type HitsQuery, HitsQuerySchema, type PublicHitItemPage } from '#shared/schemas/showcase'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CustomerHitsService } from './hits.service'

/** Vitrine Hits do app do cliente: só leitura, autenticada como o resto da superfície. */
@Controller('hits')
export class CustomerHitsController {
  constructor(private readonly hits: CustomerHitsService) {}

  @Get()
  async list(@Query(new ZodValidationPipe(HitsQuerySchema)) query: HitsQuery): Promise<PublicHitItemPage> {
    return this.hits.list(query)
  }

  @Get('banners')
  async banners(): Promise<HitsBanner[]> {
    return this.hits.banners()
  }
}
