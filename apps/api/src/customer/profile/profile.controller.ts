import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common'
import { z } from 'zod'
import { ProfileUpdateSchema, type CustomerProfile, type ProfileUpdate } from '#shared/schemas/customer'
import { CurrentUser } from '../../auth/current-user.decorator'
import type { AuthUser } from '../../auth/auth.types'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ProfileService } from './profile.service'

const ConsentBodySchema = z.object({ granted: z.boolean() })

@Controller('customer/profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  async get(@CurrentUser() user: AuthUser): Promise<CustomerProfile> {
    return unwrap(await this.profiles.get(user.id))
  }

  @Put()
  async update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ProfileUpdateSchema)) update: ProfileUpdate,
  ): Promise<CustomerProfile> {
    return unwrap(await this.profiles.update(user.id, update))
  }

  @Put('consent')
  async setConsent(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ConsentBodySchema)) body: z.infer<typeof ConsentBodySchema>,
  ): Promise<CustomerProfile> {
    return unwrap(await this.profiles.setNotificationConsent(user.id, body.granted))
  }

  @Post('terms')
  @HttpCode(200)
  async acceptTerms(@CurrentUser() user: AuthUser): Promise<CustomerProfile> {
    return unwrap(await this.profiles.acceptTerms(user.id))
  }
}
