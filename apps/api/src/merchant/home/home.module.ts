import { Module } from '@nestjs/common'
import { SessionModule } from '../session/session.module'
import { DrizzleHomeRepository } from './drizzle-home.repository'
import { HomeController } from './home.controller'
import { HomeRepository } from './home.repository'
import { HomeService } from './home.service'

@Module({
  imports: [SessionModule],
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
