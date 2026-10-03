import { Module } from '@nestjs/common'
import { ProfileModule } from '../profile/profile.module'
import { SessionController } from './session.controller'
import { SessionService } from './session.service'

@Module({ imports: [ProfileModule], controllers: [SessionController], providers: [SessionService] })
export class SessionModule {}
