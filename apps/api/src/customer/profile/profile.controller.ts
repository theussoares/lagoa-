import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common'
import {
  type ConsentUpdate,
  ConsentUpdateSchema,
  type CustomerProfile,
  type ProfileUpdate,
  ProfileUpdateSchema,
} from '#shared/schemas/customer'
import { CurrentUser } from '../../auth/current-user.decorator'
import type { AuthUser } from '../../auth/auth.types'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ProfileService } from './profile.service'

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
    @Body(new ZodValidationPipe(ConsentUpdateSchema)) body: ConsentUpdate,
  ): Promise<CustomerProfile> {
    return unwrap(await this.profiles.setNotificationConsent(user.id, body.granted))
  }

  @Post('terms')
  @HttpCode(200)
  async acceptTerms(@CurrentUser() user: AuthUser): Promise<CustomerProfile> {
    return unwrap(await this.profiles.acceptTerms(user.id))
  }
}
