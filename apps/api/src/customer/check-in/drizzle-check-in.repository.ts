import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { EarningPlan } from '#shared/domain/earning'
import type { ErrorOf } from '#shared/types/errors'
import { CHECK_IN_COOLDOWN_MAX_HOURS } from '#shared/constants/domain'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import type { Tx } from '../../database/database.module'
import { customerProfiles, ledgerEntries, loyaltyCards, programs, shops } from '../../database/schema'
import { type LockedCard, LedgerStore } from '../../ledger/ledger.store'
import { CATALOG_COLUMNS, toCatalogShop } from '../../shops/catalog-row'
import {
  type CheckInAttempt,
  type CheckInRecorded,
  CheckInRepository,
  ProgramVersionChanged,
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

  async findShopByCode(code: string, customerId: string): Promise<CheckInShop | null> {
    const [shopRow] = await this.db.select({ id: shops.id }).from(shops).where(and(eq(shops.checkInCode, code), eq(shops.status, 'approved'))).limit(1)
    if (!shopRow) return null
    // Cartão com saldo segue na versão do programa em que nasceu; sem cartão (ou zerado) vale a versão ativa.
    const [card] = await this.db
      .select({ programId: loyaltyCards.programId, balance: loyaltyCards.balance })
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, shopRow.id), eq(loyaltyCards.customerId, customerId)))
      .limit(1)
    const version = card && card.balance > 0 ? eq(programs.id, card.programId) : and(eq(programs.shopId, shopRow.id), eq(programs.active, true))
    const [row] = await this.db
      .select({
        ...CATALOG_COLUMNS,
        programId: programs.id,
        checkInEnabled: programs.checkInEnabled,
        cooldownHours: programs.checkInCooldownHours,
      })
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), version))
      .where(eq(shops.id, shopRow.id))
      .limit(1)
    if (!row) return null
    // Janela fora de 1..168 h (o CHECK do banco já barra): a loja fica de fora, nunca com check-in ilimitado.
    if (row.cooldownHours < 1 || row.cooldownHours > CHECK_IN_COOLDOWN_MAX_HOURS) return null
    const shop = toCatalogShop(row)
    return shop === null ? null : { shop, programId: row.programId, checkInEnabled: row.checkInEnabled, cooldownHours: row.cooldownHours }
  }

  async record<E>(
    { customerId, shop: target, now, clientKey }: CheckInAttempt,
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

        const { card } = await this.ledger.lockOrCreateCard(
          tx,
          { shopId: target.shop.id, customerId, programId: target.programId },
          { policy: target.shop.program.expiration, target: target.shop.program.rules.target, now },
        )
        await this.alignProgramVersion(tx, card, target.programId)
        // O mesmo toque reenviado (resposta perdida): devolve o carimbo que já está no ledger, sem decidir de novo.
        const key = clientKey === undefined ? null : `checkIn:${customerId}:${target.shop.id}:${clientKey}`
        if (key !== null) {
          const [previous] = await tx
            .select({ id: ledgerEntries.id, units: ledgerEntries.unitsDelta, occurredAt: ledgerEntries.occurredAt })
            .from(ledgerEntries)
            .where(and(eq(ledgerEntries.idempotencyKey, key), eq(ledgerEntries.cardId, card.id)))
            .limit(1)
          if (previous) {
            return ok({ cardId: card.id, entryId: previous.id, units: previous.units, balanceAfter: card.balance, recordedAt: previous.occurredAt, replayed: true })
          }
        }

        const decision = decide({
          card: { balance: card.balance, rewardExpiresAt: card.rewardExpiresAt, lastVisitAt: card.lastVisitAt },
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
          idempotencyKey: key ?? `checkIn:${card.id}:${card.lastVisitAt?.toISOString() ?? 'first'}`,
        })
        return ok({ cardId: card.id, entryId, units: decision.value.units, balanceAfter: decision.value.balanceAfter, recordedAt: now, replayed: false })
      })
    } catch (error) {
      if (error instanceof RollbackSignal && refusal.error !== null) return err(refusal.error)
      throw error
    }
  }

  /**
   * `findShopByCode` leu a versão do programa antes do lock. Cartão zerado pode mudar para a versão ativa;
   * com saldo, uma versão diferente da lida significa que o programa mudou no meio do caminho.
   */
  private async alignProgramVersion(tx: Tx, card: LockedCard, expectedProgramId: string): Promise<void> {
    const [current] = await tx.select({ programId: loyaltyCards.programId }).from(loyaltyCards).where(eq(loyaltyCards.id, card.id)).limit(1)
    if (!current || current.programId === expectedProgramId) return
    const [expected] = await tx.select({ active: programs.active }).from(programs).where(eq(programs.id, expectedProgramId)).limit(1)
    if (card.balance > 0 || !expected?.active) throw new ProgramVersionChanged()
    await tx.update(loyaltyCards).set({ programId: expectedProgramId }).where(eq(loyaltyCards.id, card.id))
  }
}
