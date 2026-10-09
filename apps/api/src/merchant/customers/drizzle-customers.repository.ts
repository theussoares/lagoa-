import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { ledgerEntries, loyaltyCards } from '../../database/schema/cards'
import { programs } from '../../database/schema/shops'
import { appUsers, customerProfiles } from '../../database/schema/users'
import { CustomersRepository, type RawCustomerCardRow } from './customers.repository'

@Injectable()
export class DrizzleCustomersRepository extends CustomersRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listShopCustomers(shopId: string): Promise<RawCustomerCardRow[]> {
    const visitsSubquery = this.db
      .select({
        cardId: ledgerEntries.cardId,
        visitsCount: sql<number>`count(*)::int`.as('visits_count'),
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.shopId, shopId), eq(ledgerEntries.countsAsVisit, true)))
      .groupBy(ledgerEntries.cardId)
      .as('visits_subquery')

    const rows = await this.db
      .select({
        customerId: loyaltyCards.customerId,
        phoneEncrypted: appUsers.phoneEncrypted,
        firstName: customerProfiles.firstName,
        unit: programs.unit,
        balance: loyaltyCards.balance,
        target: programs.target,
        visitsCount: sql<number>`coalesce(${visitsSubquery.visitsCount}, 0)::int`,
        lastVisitAt: loyaltyCards.lastVisitAt,
        acceptsNotifications: customerProfiles.notificationsConsent,
      })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(customerProfiles, eq(customerProfiles.userId, loyaltyCards.customerId))
      .innerJoin(appUsers, eq(appUsers.id, customerProfiles.userId))
      .leftJoin(visitsSubquery, eq(visitsSubquery.cardId, loyaltyCards.id))
      .where(eq(loyaltyCards.shopId, shopId))
      .orderBy(sql`${loyaltyCards.lastVisitAt} desc nulls last`, desc(loyaltyCards.id))

    return rows
  }
}
