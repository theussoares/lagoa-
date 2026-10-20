import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, ilike, sql, type SQL } from 'drizzle-orm'
import { ADMIN_SHOP_HISTORY_LIMIT, ADMIN_SHOP_STATS_WINDOW_DAYS } from '#shared/constants/domain'
import { DB, type Database } from '../../database/database.module'
import { changeShopStatus, type ShopStatusResult } from '../../database/shop-status'
import { adminUsers, appUsers, programs, shops, shopStatusEvents } from '../../database/schema'
import {
  type AdminShopDetailRecord,
  type AdminShopHistoryRecord,
  type AdminShopListFilter,
  type AdminShopRecord,
  AdminShopsRepository,
} from './shops.repository'
import type { ShopActionPlan } from './shops.rules'

const LIST_COLUMNS = {
  id: shops.id,
  name: shops.name,
  category: shops.category,
  neighborhood: shops.neighborhood,
  status: shops.status,
  plan: shops.plan,
  createdAt: shops.createdAt,
}

const RANK = sql`(case when ${shops.status} = 'pending' then 0 else 1 end)`

/** `%`, `_` e `\` do que o admin digitou valem como texto, não como coringa. */
const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`)

/**
 * Linhas depois do cursor na ordem `rank asc, created_at desc, id desc`. O `rank` vem no cursor (assim aprovar a loja do
 * cursor entre duas páginas não muda a posição dele) e o `created_at` é lido do banco, não de um `Date` do JS, que perde os microssegundos.
 */
function afterCursor(rank: number, id: string): SQL {
  return sql`(
    ${RANK} > ${rank}
    or (${RANK} = ${rank} and exists (
      select 1 from ${shops} as cursor_shop
      where cursor_shop.id = ${id}
        and (${shops.createdAt} < cursor_shop.created_at or (${shops.createdAt} = cursor_shop.created_at and ${shops.id} < cursor_shop.id))
    ))
  )`
}

@Injectable()
export class DrizzleAdminShopsRepository extends AdminShopsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async list(filter: AdminShopListFilter): Promise<readonly AdminShopRecord[]> {
    return this.db
      .select(LIST_COLUMNS)
      .from(shops)
      .where(
        and(
          filter.status === null ? undefined : eq(shops.status, filter.status),
          filter.name === null ? undefined : ilike(shops.name, `%${escapeLike(filter.name)}%`),
          filter.after === null ? undefined : afterCursor(filter.after.rank, filter.after.id),
        ),
      )
      .orderBy(sql`${RANK} asc`, sql`${shops.createdAt} desc nulls last`, desc(shops.id))
      .limit(filter.limit)
  }

  async findDetail(shopId: string): Promise<AdminShopDetailRecord | null> {
    const [shop] = await this.db
      .select({
        ...LIST_COLUMNS,
        addressLine: shops.addressLine,
        phoneEncrypted: appUsers.phoneEncrypted,
        emailEncrypted: appUsers.emailEncrypted,
        ownerErasedAt: appUsers.erasedAt,
      })
      .from(shops)
      .innerJoin(appUsers, eq(appUsers.id, shops.ownerUserId))
      .where(eq(shops.id, shopId))
      .limit(1)
    if (!shop) return null
    const [program, stats, history] = await Promise.all([this.activeProgram(shopId), this.stats(shopId), this.history(shopId)])
    const { phoneEncrypted, emailEncrypted, ownerErasedAt, ...record } = shop
    return {
      ...record,
      program,
      owner: ownerErasedAt === null ? { phoneEncrypted, emailEncrypted } : null,
      customers: stats.customers,
      visitsLast30Days: stats.visitsLast30Days,
      history,
    }
  }

  async applyAction(shopId: string, adminId: string, action: ShopActionPlan): Promise<ShopStatusResult> {
    return changeShopStatus(this.db, {
      shopId,
      actor: { kind: 'admin', adminId },
      ...(action.status !== undefined && { status: action.status }),
      ...(action.plan !== undefined && { plan: action.plan }),
      ...(action.reason !== undefined && { reason: action.reason }),
      ...(action.allowedFrom !== undefined && { allowedFrom: action.allowedFrom }),
    })
  }

  private async activeProgram(shopId: string): Promise<AdminShopDetailRecord['program']> {
    const [program] = await this.db
      .select({ rewardTitle: programs.rewardTitle, mode: programs.mode, target: programs.target })
      .from(programs)
      .where(and(eq(programs.shopId, shopId), eq(programs.active, true)))
      .limit(1)
    return program ?? null
  }

  /** Uma consulta, dois contadores: clientes = cartões da loja; visitas = linhas que contam como visita na janela. */
  private async stats(shopId: string): Promise<{ customers: number; visitsLast30Days: number }> {
    const [row] = await this.db.execute<{ customers: number; visits: number }>(sql`
      select
        (select count(*)::int from loyalty_cards where shop_id = ${shopId}) as customers,
        (select count(*)::int from ledger_entries
          where shop_id = ${shopId} and counts_as_visit and occurred_at >= now() - make_interval(days => ${ADMIN_SHOP_STATS_WINDOW_DAYS})) as visits
    `)
    return { customers: row?.customers ?? 0, visitsLast30Days: row?.visits ?? 0 }
  }

  private async history(shopId: string): Promise<AdminShopHistoryRecord[]> {
    const rows = await this.db
      .select({
        id: shopStatusEvents.id,
        fromStatus: shopStatusEvents.fromStatus,
        toStatus: shopStatusEvents.toStatus,
        plan: shopStatusEvents.plan,
        actor: shopStatusEvents.actor,
        adminName: adminUsers.name,
        reason: shopStatusEvents.reason,
        createdAt: shopStatusEvents.createdAt,
      })
      .from(shopStatusEvents)
      .leftJoin(adminUsers, eq(adminUsers.id, shopStatusEvents.actorAdminId))
      .where(eq(shopStatusEvents.shopId, shopId))
      .orderBy(sql`${shopStatusEvents.createdAt} desc nulls last`, desc(shopStatusEvents.id))
      .limit(ADMIN_SHOP_HISTORY_LIMIT)
    return rows.map(({ actor, adminName, ...event }) => ({ ...event, actorName: adminName ?? actor }))
  }
}
