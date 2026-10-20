import { Global, Module } from '@nestjs/common'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'
import { createSupabaseJwks, JWKS } from './jwks'
import { SupabaseAuthGuard } from './supabase-auth.guard'
import { SurfaceRoleGuard } from './surface-role.guard'
import { UserThrottlerGuard } from './user-throttler.guard'

@Global()
@Module({
  providers: [
    { provide: JWKS, inject: [ENV], useFactory: (env: Env) => createSupabaseJwks(env) },
    SupabaseAuthGuard,
    UserThrottlerGuard,
    SurfaceRoleGuard,
  ],
  exports: [JWKS, SupabaseAuthGuard, UserThrottlerGuard, SurfaceRoleGuard],
})
export class AuthModule {}
