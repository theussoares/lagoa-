import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { type HitItemDraft, HitItemDraftSchema, type MerchantHitItem, type MerchantHitItemList } from '#shared/schemas/hitItem'
import { type ShopPhotoUpload, ShopPhotoUploadSchema } from '#shared/schemas/shop'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CurrentShop } from '../access/current-shop.decorator'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { MerchantSurface } from '../access/merchant-surface.decorator'
import { HitsService } from './hits.service'

const HitIdParam = new ZodValidationPipe(z.uuid())
const DraftBody = new ZodValidationPipe(HitItemDraftSchema)

/** Produtos da loja na vitrine Hits. A loja vem do JWT (`CurrentShop`), nunca do corpo nem da rota. */
@MerchantSurface()
@Controller('merchant/hits')
export class HitsController {
  constructor(private readonly hits: HitsService) {}

  @Get()
  async list(@CurrentShop() shop: MerchantShopContext): Promise<MerchantHitItemList> {
    return this.hits.list(shop)
  }

  @Post()
  async create(@CurrentShop() shop: MerchantShopContext, @Body(DraftBody) draft: HitItemDraft): Promise<MerchantHitItem> {
    return unwrap(await this.hits.create(shop, draft))
  }

  @Patch(':id')
  async update(
    @CurrentShop() shop: MerchantShopContext,
    @Param('id', HitIdParam) id: string,
    @Body(DraftBody) draft: HitItemDraft,
  ): Promise<MerchantHitItem> {
    return unwrap(await this.hits.update(shop, id, draft))
  }

  /** 20 trocas por hora: cada uma grava um arquivo no bucket. */
  @Put(':id/photo')
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  async replacePhoto(
    @CurrentShop() shop: MerchantShopContext,
    @Param('id', HitIdParam) id: string,
    @Body(new ZodValidationPipe(ShopPhotoUploadSchema)) upload: ShopPhotoUpload,
  ): Promise<MerchantHitItem> {
    return unwrap(await this.hits.replacePhoto(shop, id, upload))
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@CurrentShop() shop: MerchantShopContext, @Param('id', HitIdParam) id: string): Promise<MerchantHitItem> {
    return unwrap(await this.hits.archive(shop, id))
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchive(@CurrentShop() shop: MerchantShopContext, @Param('id', HitIdParam) id: string): Promise<MerchantHitItem> {
    return unwrap(await this.hits.unarchive(shop, id))
  }
}
