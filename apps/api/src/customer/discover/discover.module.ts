import { Module } from '@nestjs/common'
import { DiscoverController } from './discover.controller'
import { DiscoverRepository } from './discover.repository'
import { DiscoverService } from './discover.service'
import { DrizzleDiscoverRepository } from './drizzle-discover.repository'

@Module({
  controllers: [DiscoverController],
  providers: [DiscoverService, { provide: DiscoverRepository, useClass: DrizzleDiscoverRepository }],
})
export class DiscoverModule {}
