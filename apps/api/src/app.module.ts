import { Module } from '@nestjs/common'
import { CommonModule } from './common/common.module'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [ConfigModule, DatabaseModule, CommonModule],
  controllers: [HealthController],
})
export class AppModule {}
