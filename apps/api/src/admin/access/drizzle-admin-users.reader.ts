import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { adminUsers } from '../../database/schema'
import { AdminUsersReader } from './admin-users.reader'

@Injectable()
export class DrizzleAdminUsersReader extends AdminUsersReader {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  /** Uma consulta pela chave primária; a cada pedido, para a desativação valer na hora (sem esperar o token vencer). */
  async isActiveAdmin(userId: string): Promise<boolean> {
    const [admin] = await this.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(and(eq(adminUsers.id, userId), isNull(adminUsers.disabledAt)))
      .limit(1)
    return admin !== undefined
  }
}
