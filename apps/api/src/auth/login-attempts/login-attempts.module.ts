import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DB, type Database } from '../../database/database.module'
import { PostgresThrottlerStorage } from '../../throttling/postgres-throttler.storage'
import { LOGIN_ATTEMPT_COUNTER, LoginAttemptGate } from './login-attempt-gate'
import { LoginAttemptsController } from './login-attempts.controller'

@Module({
  imports: [CommonModule],
  controllers: [LoginAttemptsController],
  providers: [{ provide: LOGIN_ATTEMPT_COUNTER, inject: [DB], useFactory: (db: Database) => new PostgresThrottlerStorage(db) }, LoginAttemptGate],
})
export class LoginAttemptsModule {}
