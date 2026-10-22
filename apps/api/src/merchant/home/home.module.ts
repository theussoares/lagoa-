import { Module } from '@nestjs/common'
import { SessionModule } from '../session/session.module'
import { DrizzleHomeRepository } from './drizzle-home.repository'
import { HomeController } from './home.controller'
import { HomeRepository } from './home.repository'
import { HomeService } from './home.service'
import { CommonModule } from '../../common/common.module'
import { AccessModule } from '../access/access.module'

@Module({
  imports: [AccessModule, SessionModule, CommonModule],
  controllers: [HomeController],
  providers: [
    HomeService,
    {
      provide: HomeRepository,
      useClass: DrizzleHomeRepository,
    },
  ],
  exports: [HomeService, HomeRepository],
})
export class HomeModule {}
