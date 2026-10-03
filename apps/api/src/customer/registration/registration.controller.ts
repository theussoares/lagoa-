import { Body, Controller, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import type { CustomerSession } from '#shared/schemas/session'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { RegistrationService } from './registration.service'

const PHONE_INPUT_MAX_LENGTH = 32
const RegistrationBodySchema = z.object({ phone: z.string().max(PHONE_INPUT_MAX_LENGTH) })

@Controller('customer/registration')
export class RegistrationController {
  constructor(private readonly registrations: RegistrationService) {}

  /** Limite curto: o erro de celular repetido não pode servir para varrer números cadastrados. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RegistrationBodySchema)) body: z.infer<typeof RegistrationBodySchema>,
  ): Promise<CustomerSession> {
    const { customerId, created } = unwrap(await this.registrations.register(user.id, user.email, body.phone))
    return { role: 'customer', customerId, isNewCustomer: created }
  }
}
