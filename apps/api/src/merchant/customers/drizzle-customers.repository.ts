import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { loyaltyCards } from '../../database/schema/cards'
import { programs } from '../../database/schema/shops'
import { appUsers, customerProfiles } from '../../database/schema/users'
import { CustomersRepository, type RawCustomerCardRow } from './customers.repository'

@Injectable()
export class DrizzleCustomersRepository extends CustomersRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listShopCustomers(shopId: string): Promise<RawCustomerCardRow[]> {
    const rows = await this.db
      .select({
        customerId: loyaltyCards.customerId,
        phoneEncrypted: appUsers.phoneEncrypted,
        firstName: customerProfiles.firstName,
        unit: programs.unit,
        balance: loyaltyCards.balance,
        target: programs.target,
        visitsCount: loyaltyCards.visitsCount,
        lastVisitAt: loyaltyCards.lastVisitAt,
        acceptsNotifications: customerProfiles.notificationsConsent,
      })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(customerProfiles, eq(customerProfiles.userId, loyaltyCards.customerId))
      .innerJoin(appUsers, eq(appUsers.id, customerProfiles.userId))
      // Conta apagada fica fora: o celular dela é um buffer vazio que ninguém decifra (R8).
      .where(and(eq(loyaltyCards.shopId, shopId), isNull(appUsers.erasedAt)))
      .orderBy(sql`${loyaltyCards.lastVisitAt} desc nulls last`, desc(loyaltyCards.id))

    return rows
  }
}
