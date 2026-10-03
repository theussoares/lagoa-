import { Module } from '@nestjs/common'
import { ProfileModule } from './profile/profile.module'
import { RegistrationModule } from './registration/registration.module'
import { SessionModule } from './session/session.module'

/** Superfície do cliente (app mobile). O painel do lojista vive em `merchant/`. */
@Module({ imports: [RegistrationModule, SessionModule, ProfileModule] })
export class CustomerModule {}
