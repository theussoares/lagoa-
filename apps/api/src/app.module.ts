import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { SmsModule } from './auth/sms/sms.module'
import { SupabaseAuthGuard } from './auth/supabase-auth.guard'
import { UserThrottlerGuard } from './auth/user-throttler.guard'
import { clientIpOf } from './common/http/client-ip'
import { AllExceptionsFilter } from './common/http/all-exceptions.filter'
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
    AuthModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      // Teto por IP (confiável com TRUST_PROXY_HOPS; atrás do BFF vale o IP que ele repassa com o segredo): contas diferentes no mesmo IP somam aqui.
      { name: 'ip', ttl: 60_000, limit: 600, getTracker: (request) => clientIpOf(request) },
    ]),
    CustomerModule,
    SmsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // A ordem importa: o auth roda antes para o limite contar por usuário.
    { provide: APP_GUARD, useExisting: SupabaseAuthGuard },
    { provide: APP_GUARD, useExisting: UserThrottlerGuard },
  ],
})
export class AppModule {}
