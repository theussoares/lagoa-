import { Module } from '@nestjs/common'
import { DrizzleRankingRepository } from './drizzle-ranking.repository'
import { RankingController } from './ranking.controller'
import { RankingRepository } from './ranking.repository'
import { RankingService } from './ranking.service'

@Module({
  controllers: [RankingController],
  providers: [RankingService, { provide: RankingRepository, useClass: DrizzleRankingRepository }],
})
export class RankingModule {}
