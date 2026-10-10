import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { DrizzleSessionRepository } from './drizzle-session.repository'
import { SessionController } from './session.controller'
import { SessionRepository } from './session.repository'
import { SessionService } from './session.service'
import { AccessModule } from '../access/access.module'

@Module({
  imports: [AccessModule, DatabaseModule],
  controllers: [SessionController],
  providers: [
    SessionService,
    { provide: SessionRepository, useClass: DrizzleSessionRepository },
  ],
  exports: [SessionService, SessionRepository],
})
export class SessionModule {}
