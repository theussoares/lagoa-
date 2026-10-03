import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { EarningPlan } from '#shared/domain/earning'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { customerProfiles, programs, shops } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { CATALOG_COLUMNS, toCatalogShop } from '../../shops/catalog-row'
import {
  type CheckInAttempt,
  type CheckInRecorded,
  CheckInRepository,
  type CheckInShop,
  type CheckInState,
} from './check-in.repository'

/** Desfaz a transação quando a regra recusa; o erro de domínio sai pelo `refusal`, não pela exceção. */
class RollbackSignal extends Error {}

@Injectable()
export class DrizzleCheckInRepository extends CheckInRepository {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly ledger: LedgerStore,
  ) {
    super()
  }

  async findShopByCode(code: string): Promise<CheckInShop | null> {
    const [row] = await this.db
      .select({
        ...CATALOG_COLUMNS,
        programId: programs.id,
        checkInEnabled: programs.checkInEnabled,
        cooldownHours: programs.checkInCooldownHours,
      })
      .from(shops)
      .innerJoin(programs, eq(programs.shopId, shops.id))
      .where(and(eq(shops.checkInCode, code), eq(shops.status, 'approved')))
      .limit(1)
    if (!row) return null
    const shop = toCatalogShop(row)
    return shop === null ? null : { shop, programId: row.programId, checkInEnabled: row.checkInEnabled, cooldownHours: row.cooldownHours }
  }

  async record<E>(
    { customerId, shop: target, now }: CheckInAttempt,
    decide: (state: CheckInState) => Result<EarningPlan, E>,
  ): Promise<Result<CheckInRecorded, E | ErrorOf<'unauthorized'>>> {
    const refusal: { error: E | ErrorOf<'unauthorized'> | null } = { error: null }
    try {
      return await this.db.transaction(async (tx) => {
        const [profile] = await tx
          .select({ birthday: customerProfiles.birthday })
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, customerId))
          .limit(1)
        if (!profile) {
          refusal.error = { code: 'unauthorized' }
          throw new RollbackSignal()
        }

        const { card, created } = await this.ledger.lockOrCreateCard(tx, {
          shopId: target.shop.id,
          customerId,
          programId: target.programId,
        })
        const decision = decide({
          card: created ? null : { balance: card.balance, rewardExpiresAt: card.rewardExpiresAt },
          lastVisitAt: card.lastVisitAt,
          birthday: profile.birthday,
        })
        if (!decision.ok) {
          refusal.error = decision.error
          throw new RollbackSignal()
        }

        // Rede de segurança: sob o lock a janela já barra o repetido; a chave garante no banco.
        const { entryId } = await this.ledger.credit(tx, {
          card,
          shopId: target.shop.id,
          customerId,
          plan: decision.value,
          kind: 'checkIn',
          now,
          idempotencyKey: `checkIn:${card.id}:${card.lastVisitAt?.toISOString() ?? 'first'}`,
        })
        return ok({ cardId: card.id, entryId, plan: decision.value })
      })
    } catch (error) {
      if (error instanceof RollbackSignal && refusal.error !== null) return err(refusal.error)
      throw error
    }
  }
}
