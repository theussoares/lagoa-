import { Global, Module } from '@nestjs/common'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'
import { createSupabaseJwks, JWKS } from './jwks'
import { SupabaseAuthGuard } from './supabase-auth.guard'
import { UserThrottlerGuard } from './user-throttler.guard'

@Global()
@Module({
  providers: [
    { provide: JWKS, inject: [ENV], useFactory: (env: Env) => createSupabaseJwks(env) },
    SupabaseAuthGuard,
    UserThrottlerGuard,
  ],
  exports: [JWKS, SupabaseAuthGuard, UserThrottlerGuard],
})
export class AuthModule {}
