import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, isNull, lte, sql, type SQL } from 'drizzle-orm'
import type { CustomerFilter } from '#shared/schemas/customer'
import { DB, type Database } from '../../database/database.module'
import { ledgerEntries, loyaltyCards } from '../../database/schema/cards'
import { programs } from '../../database/schema/shops'
import { appUsers, customerProfiles } from '../../database/schema/users'
import {
  type CustomerCounts,
  type CustomerPageQuery,
  CustomersRepository,
  type CustomerScope,
  type RawCustomerCardRow,
} from './customers.repository'

/** Mesmas regras de `isLapsedSince` e `isRewardReady`, aplicadas no banco para filtrar antes de paginar e contar. */
function filterCondition(filter: CustomerFilter, cutoff: Date): SQL | undefined {
  if (filter === 'lapsed') return lte(loyaltyCards.lastVisitAt, cutoff)
  if (filter === 'rewardReady') return gte(loyaltyCards.balance, programs.target)
  return undefined
}

/**
 * Linhas depois do cartão do cliente-cursor na ordem `last_visit_at desc nulls last, id desc`. Compara com o valor
 * guardado no banco (não com um `Date` do JS, que perde os microssegundos) e só acha o cursor na mesma loja.
 */
function afterCursor(shopId: string, customerId: string): SQL {
  return sql`exists (
    select 1 from ${loyaltyCards} as cursor_card
    where cursor_card.shop_id = ${shopId} and cursor_card.customer_id = ${customerId}
      and (
        (cursor_card.last_visit_at is not null and (
          ${loyaltyCards.lastVisitAt} < cursor_card.last_visit_at
          or (${loyaltyCards.lastVisitAt} = cursor_card.last_visit_at and ${loyaltyCards.id} < cursor_card.id)
          or ${loyaltyCards.lastVisitAt} is null))
        or (cursor_card.last_visit_at is null and ${loyaltyCards.lastVisitAt} is null and ${loyaltyCards.id} < cursor_card.id)
      )
  )`
}

@Injectable()
export class DrizzleCustomersRepository extends CustomersRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listShopCustomers(query: CustomerPageQuery): Promise<RawCustomerCardRow[]> {
    return this.db
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
        // Uma consulta pelo índice `(card, occurred_at desc, id desc)` por linha da página (no máximo MERCHANT_CUSTOMERS_PAGE_SIZE).
        lastAmountCents: sql<number | null>`(
          select ${ledgerEntries.amountCents} from ${ledgerEntries}
          where ${ledgerEntries.cardId} = ${loyaltyCards.id} and ${ledgerEntries.amountCents} is not null
          order by ${ledgerEntries.occurredAt} desc nulls last, ${ledgerEntries.id} desc
          limit 1
        )`,
      })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(customerProfiles, eq(customerProfiles.userId, loyaltyCards.customerId))
      .innerJoin(appUsers, eq(appUsers.id, customerProfiles.userId))
      .where(and(this.scopeCondition(query), query.after === null ? undefined : afterCursor(query.shopId, query.after)))
      .orderBy(sql`${loyaltyCards.lastVisitAt} desc nulls last`, desc(loyaltyCards.id))
      .limit(query.limit)
  }

  async countShopCustomers(scope: CustomerScope): Promise<CustomerCounts> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        acceptingNotifications: sql<number>`(count(*) filter (where ${customerProfiles.notificationsConsent}))::int`,
      })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(customerProfiles, eq(customerProfiles.userId, loyaltyCards.customerId))
      .innerJoin(appUsers, eq(appUsers.id, customerProfiles.userId))
      .where(this.scopeCondition(scope))
    return { total: row?.total ?? 0, acceptingNotifications: row?.acceptingNotifications ?? 0 }
  }

  private scopeCondition(scope: CustomerScope): SQL | undefined {
    return and(
      eq(loyaltyCards.shopId, scope.shopId),
      // Conta apagada fica fora: o celular dela é um buffer vazio que ninguém decifra (R8).
      isNull(appUsers.erasedAt),
      filterCondition(scope.filter, scope.lapsedCutoff),
    )
  }
}
