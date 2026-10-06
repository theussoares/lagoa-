import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { CHECK_IN_COOLDOWN_MAX_HOURS } from '#shared/constants/domain'
import type { CheckInCode } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { customerProfiles, loyaltyCards, programs, shops } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { toExpirationPolicy, toProgramRules } from '../../programs/program-rules.mapper'
import { type JoinableShop, ShopJoinRepository } from './shop-join.repository'

/** Desfaz a transação quando falta o perfil; o erro de domínio sai pelo `Result`. */
class RollbackSignal extends Error {}

@Injectable()
export class DrizzleShopJoinRepository extends ShopJoinRepository {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly ledger: LedgerStore,
  ) {
    super()
  }

  async findShopByCode(code: CheckInCode): Promise<JoinableShop | null> {
    const [row] = await this.db
      .select({
        shopId: shops.id,
        programId: programs.id,
        joinEnabled: programs.checkInEnabled,
        cooldownHours: programs.checkInCooldownHours,
        mode: programs.mode,
        earnUnits: programs.earnUnits,
        target: programs.target,
        expirationKind: programs.expirationKind,
        expirationMonths: programs.expirationMonths,
      })
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(and(eq(shops.checkInCode, code), eq(shops.status, 'approved')))
      .limit(1)
    if (!row) return null
    // Janela fora de 1..168 h (o CHECK do banco já barra): a loja fica de fora, igual ao check-in.
    if (row.cooldownHours < 1 || row.cooldownHours > CHECK_IN_COOLDOWN_MAX_HOURS) return null
    const expiration = toExpirationPolicy(row)
    const rules = toProgramRules(row)
    if (!expiration.ok || !rules.ok) return null
    return { shopId: row.shopId, programId: row.programId, joinEnabled: row.joinEnabled, expiration: expiration.value, target: rules.value.target }
  }

  async findCardId(customerId: string, shopId: string): Promise<string | null> {
    const [card] = await this.db
      .select({ id: loyaltyCards.id })
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, shopId), eq(loyaltyCards.customerId, customerId)))
      .limit(1)
    return card?.id ?? null
  }

  async join(customerId: string, shop: JoinableShop, now: Date): Promise<Result<{ cardId: string; created: boolean }, ErrorOf<'unauthorized'>>> {
    try {
      return await this.db.transaction(async (tx) => {
        const [profile] = await tx.select({ userId: customerProfiles.userId }).from(customerProfiles).where(eq(customerProfiles.userId, customerId)).limit(1)
        if (!profile) throw new RollbackSignal()
        const { card, created } = await this.ledger.lockOrCreateCard(
          tx,
          { shopId: shop.shopId, customerId, programId: shop.programId },
          { policy: shop.expiration, target: shop.target, now },
        )
        return ok({ cardId: card.id, created })
      })
    } catch (error) {
      if (error instanceof RollbackSignal) return err({ code: 'unauthorized' })
      throw error
    }
  }
}
