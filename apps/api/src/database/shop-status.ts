import { eq } from 'drizzle-orm'
import type { ShopPlan, ShopStatus } from '#shared/schemas/shop'
import type { Database } from './database.module'
import { shops, shopStatusEvents } from './schema'

export interface ShopStatusChange {
  readonly shopId: string
  readonly status?: ShopStatus
  readonly plan?: ShopPlan
  readonly actor: ShopStatusActor
  readonly reason?: string
  /** Só muda se a situação atual (lida sob o lock) estiver aqui; senão `invalidTransition`. */
  readonly allowedFrom?: readonly ShopStatus[]
}

/** Quem agiu: o operador do script (apelido, nunca e-mail: é dado pessoal e este registro é para auditoria) ou um admin do painel. */
export type ShopStatusActor =
  | { readonly kind: 'script'; readonly nickname: string }
  | { readonly kind: 'admin'; readonly adminId: string }

/** Valor de `shop_status_events.actor` nas linhas feitas pelo painel (quem foi está em `actor_admin_id`). */
export const ADMIN_PANEL_ACTOR = 'admin'

export type ShopStatusResult =
  | { readonly ok: true; readonly from: ShopStatus; readonly to: ShopStatus; readonly plan: ShopPlan }
  | { readonly ok: false; readonly reason: 'shopNotFound' | 'nothingToChange' | 'invalidActor' | 'invalidTransition' }

const ACTOR = /^[a-z0-9._-]{2,40}$/

/** Aprova/suspende a loja e/ou troca o plano e grava o evento na mesma transação, com a linha da loja travada. */
export async function changeShopStatus(db: Pick<Database, 'transaction'>, change: ShopStatusChange): Promise<ShopStatusResult> {
  if (change.actor.kind === 'script' && !ACTOR.test(change.actor.nickname)) return { ok: false, reason: 'invalidActor' }
  if (change.status === undefined && change.plan === undefined) return { ok: false, reason: 'nothingToChange' }
  return db.transaction(async (tx): Promise<ShopStatusResult> => {
    const [shop] = await tx.select({ status: shops.status, plan: shops.plan }).from(shops).where(eq(shops.id, change.shopId)).for('update')
    if (!shop) return { ok: false, reason: 'shopNotFound' }
    if (change.allowedFrom !== undefined && !change.allowedFrom.includes(shop.status)) return { ok: false, reason: 'invalidTransition' }
    const to = change.status ?? shop.status
    const plan = change.plan ?? shop.plan
    if (to === shop.status && plan === shop.plan) return { ok: false, reason: 'nothingToChange' }
    await tx.update(shops).set({ status: to, plan }).where(eq(shops.id, change.shopId))
    await tx.insert(shopStatusEvents).values({
      shopId: change.shopId,
      fromStatus: shop.status,
      toStatus: to,
      plan,
      actor: change.actor.kind === 'script' ? change.actor.nickname : ADMIN_PANEL_ACTOR,
      actorAdminId: change.actor.kind === 'admin' ? change.actor.adminId : null,
      reason: change.reason ?? null,
    })
    return { ok: true, from: shop.status, to, plan }
  })
}
