import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { SupabaseAuthGuard } from './auth/supabase-auth.guard'
import { CommonModule } from './common/common.module'
import { ConfigModule } from './config/config.module'
import { CustomerModule } from './customer/customer.module'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CustomerModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
})
export class AppModule {}
