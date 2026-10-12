import { Controller, Get, Query } from '@nestjs/common'
import { CustomerFilterSchema, type CustomerFilter, type MerchantCustomerPage } from '#shared/schemas/customer'
import { z } from 'zod'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CustomersService } from './customers.service'
import { MerchantSurface } from '../access/merchant-surface.decorator'

const CustomerFilterQuery = new ZodValidationPipe(CustomerFilterSchema.default('all'))
/** Cursor é o id (UUID) de um cliente; de outra loja não casa com nenhum cartão desta e a página vem vazia. */
const CursorQuery = new ZodValidationPipe(z.uuid().optional())

@MerchantSurface()
@Controller('merchant/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('filter', CustomerFilterQuery) filter: CustomerFilter,
    @Query('cursor', CursorQuery) cursor: string | undefined,
  ): Promise<MerchantCustomerPage> {
    return unwrap(await this.customers.listCustomers(user.id, filter, cursor ?? null))
  }
}
