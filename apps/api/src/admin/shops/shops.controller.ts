import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { z } from 'zod'
import {
  type AdminShopAction,
  AdminShopActionSchema,
  type AdminShopDetail,
  type AdminShopList,
  type AdminShopListQuery,
  AdminShopListQuerySchema,
} from '#shared/schemas/admin'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import type { AdminContext } from '../access/admin.context'
import { AdminSurface } from '../access/admin-surface.decorator'
import { CurrentAdmin } from '../access/current-admin.decorator'
import { AdminShopsService } from './shops.service'

const ShopIdParam = new ZodValidationPipe(z.uuid())

/** Lojas da rede. O contato do dono só sai no detalhe. */
@AdminSurface()
@Controller('admin/shops')
export class AdminShopsController {
  constructor(private readonly shops: AdminShopsService) {}

  @Get()
  async list(@Query(new ZodValidationPipe(AdminShopListQuerySchema)) query: AdminShopListQuery): Promise<AdminShopList> {
    return this.shops.list(query)
  }

  @Get(':id')
  async detail(@Param('id', ShopIdParam) id: string): Promise<AdminShopDetail> {
    return unwrap(await this.shops.detail(id))
  }

  @Post(':id/actions')
  @HttpCode(HttpStatus.OK)
  async act(
    @CurrentAdmin() admin: AdminContext,
    @Param('id', ShopIdParam) id: string,
    @Body(new ZodValidationPipe(AdminShopActionSchema)) action: AdminShopAction,
  ): Promise<AdminShopDetail> {
    return unwrap(await this.shops.act(admin, id, action))
  }
}
