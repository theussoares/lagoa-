import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type CustomerRegistration, CustomerRegistrationSchema } from '#shared/schemas/customer'
import type { CustomerSession } from '#shared/schemas/session'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { RegistrationService } from './registration.service'

@Controller('customer/registration')
export class RegistrationController {
  constructor(private readonly registrations: RegistrationService) {}

  /** Limite curto por conta e por IP: o erro de celular repetido não pode servir para varrer números cadastrados. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 }, ip: { limit: 15, ttl: 60_000 } })
  async register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CustomerRegistrationSchema)) body: CustomerRegistration,
  ): Promise<CustomerSession> {
    return unwrap(await this.registrations.register(user.id, user.email, body.phone))
  }
}
