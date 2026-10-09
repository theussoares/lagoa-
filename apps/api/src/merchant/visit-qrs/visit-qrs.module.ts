import { Module } from '@nestjs/common'
import { SessionModule } from '../session/session.module'
import { DrizzleVisitQrsRepository } from './drizzle-visit-qrs.repository'
import { VisitQrsController } from './visit-qrs.controller'
import { VisitQrsRepository } from './visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs.rules'
import { VisitQrsService } from './visit-qrs.service'

@Module({
  imports: [SessionModule],
  controllers: [VisitQrsController],
  providers: [
    VisitQrsService,
    VisitQrsRules,
    {
      provide: VisitQrsRepository,
      useClass: DrizzleVisitQrsRepository,
    },
  ],
  exports: [VisitQrsService, VisitQrsRepository],
})
export class VisitQrsModule {}
