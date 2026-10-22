import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { AdminGuard } from './admin.guard'
import { AdminUsersReader } from './admin-users.reader'
import { DrizzleAdminUsersReader } from './drizzle-admin-users.reader'

/** Importado por todo submódulo do `AdminModule`: o `@AdminSurface()` precisa do `AdminGuard` no módulo do controller. */
@Module({
  imports: [DatabaseModule],
  providers: [AdminGuard, { provide: AdminUsersReader, useClass: DrizzleAdminUsersReader }],
  exports: [AdminGuard, AdminUsersReader],
})
export class AdminAccessModule {}
