import { Controller, Get, Query } from '@nestjs/common'
import { CustomerFilterSchema, type CustomerFilter, type MerchantCustomerRow } from '#shared/schemas/customer'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CustomersService } from './customers.service'
import { MerchantSurface } from '../access/merchant-surface.decorator'

const CustomerFilterQuery = new ZodValidationPipe(CustomerFilterSchema.default('all'))

@MerchantSurface()
@Controller('merchant/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('filter', CustomerFilterQuery) filter: CustomerFilter,
  ): Promise<MerchantCustomerRow[]> {
    return unwrap(await this.customers.listCustomers(user.id, filter))
  }
}
