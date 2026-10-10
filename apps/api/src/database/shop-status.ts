import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ShopPlanSchema, ShopStatusSchema, type ShopPlan, type ShopStatus } from '#shared/schemas/shop'
import { parseEnv } from '../config/env'
import type { Database } from './database.module'
import { shops, shopStatusEvents } from './schema'

export interface ShopStatusChange {
  readonly shopId: string
  readonly status?: ShopStatus
  readonly plan?: ShopPlan
  /** Apelido do operador (nunca e-mail: é dado pessoal e este registro é para auditoria). */
  readonly actor: string
  readonly reason?: string
}

export type ShopStatusResult =
  | { readonly ok: true; readonly from: ShopStatus; readonly to: ShopStatus; readonly plan: ShopPlan }
  | { readonly ok: false; readonly reason: 'shopNotFound' | 'nothingToChange' | 'invalidActor' }

const ACTOR = /^[a-z0-9._-]{2,40}$/

/** Aprova/suspende a loja e/ou troca o plano e grava o evento na mesma transação, com a linha da loja travada. */
export async function changeShopStatus(db: Pick<Database, 'transaction'>, change: ShopStatusChange): Promise<ShopStatusResult> {
  if (!ACTOR.test(change.actor)) return { ok: false, reason: 'invalidActor' }
  if (change.status === undefined && change.plan === undefined) return { ok: false, reason: 'nothingToChange' }
  return db.transaction(async (tx): Promise<ShopStatusResult> => {
    const [shop] = await tx.select({ status: shops.status, plan: shops.plan }).from(shops).where(eq(shops.id, change.shopId)).for('update')
    if (!shop) return { ok: false, reason: 'shopNotFound' }
    const to = change.status ?? shop.status
    const plan = change.plan ?? shop.plan
    await tx.update(shops).set({ status: to, plan }).where(eq(shops.id, change.shopId))
    await tx.insert(shopStatusEvents).values({
      shopId: change.shopId,
      fromStatus: shop.status,
      toStatus: to,
      plan,
      actor: change.actor,
      reason: change.reason ?? null,
    })
    return { ok: true, from: shop.status, to, plan }
  })
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

/**
 * `pnpm shop:status --shop <id> [--status approved|suspended|pending] [--plan founder|founderPro] --actor <apelido> [--reason "..."]`.
 * Só roda com `ALLOW_SHOP_ADMIN=1` e nunca em CI: aprovar loja é decisão da rede, não de um endpoint.
 */
async function main(): Promise<void> {
  if (process.env.ALLOW_SHOP_ADMIN !== '1') throw new Error('Refusing to run: set ALLOW_SHOP_ADMIN=1')
  if (process.env.CI) throw new Error('Refusing to run in CI')
  const status = argument('status')
  const plan = argument('plan')
  const parsedStatus = status === undefined ? undefined : ShopStatusSchema.parse(status)
  const parsedPlan = plan === undefined ? undefined : ShopPlanSchema.parse(plan)
  const shopId = argument('shop')
  const actor = argument('actor')
  if (shopId === undefined || actor === undefined) throw new Error('Usage: --shop <id> --actor <nickname> [--status ...] [--plan ...] [--reason "..."]')

  const client = postgres(parseEnv(process.env).DATABASE_URL, { prepare: false })
  try {
    const reason = argument('reason')
    const result = await changeShopStatus(drizzle(client), {
      shopId,
      actor,
      ...(parsedStatus !== undefined && { status: parsedStatus }),
      ...(parsedPlan !== undefined && { plan: parsedPlan }),
      ...(reason !== undefined && { reason }),
    })
    if (!result.ok) throw new Error(`Not changed: ${result.reason}`)
    console.log(`Shop ${shopId}: ${result.from} -> ${result.to} (plan ${result.plan})`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'shop:status failed')
    process.exitCode = 1
  })
}
