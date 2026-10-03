import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { welcomeUnits } from '#shared/domain/bonusRules'
import type { EarningPlan } from '#shared/domain/earning'
import { REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { BonusRulesSchema } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { addDays } from '#shared/utils/time'
import type { Tx } from '../database/database.module'
import { ledgerEntries, loyaltyCards, programs, redemptions } from '../database/schema'

export interface LockedCard {
  readonly id: string
  readonly balance: number
  readonly lastVisitAt: Date | null
  readonly rewardExpiresAt: Date | null
}

export interface CardKey {
  readonly shopId: string
  readonly customerId: string
  readonly programId: string
}

export type VisitKind = 'visit' | 'amount' | 'checkIn'

export interface CreditCommand {
  readonly card: LockedCard
  readonly shopId: string
  readonly customerId: string
  readonly plan: EarningPlan
  readonly kind: VisitKind
  readonly now: Date
  /** Único por lançamento: repetir o mesmo pedido não grava duas vezes. */
  readonly idempotencyKey: string
  /** Lojista que lançou no balcão; `null` no check-in. */
  readonly recordedBy?: string | null
  readonly amountCents?: number | null
}

export interface SettleCommand {
  readonly redemptionId: string
  /** Loja de quem valida: o código de outra loja é `redemptionInvalid`. */
  readonly shopId: string
  readonly recordedBy: string
  readonly now: Date
}

export interface SettledRedemption {
  readonly cardId: string
  readonly customerId: string
  readonly target: number
  readonly balanceAfter: number
  /** Boas-vindas do cartão que recomeça (0 com a regra desligada). */
  readonly welcomeUnits: number
}

export type SettleError = ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>

/**
 * Única porta de escrita do ledger. Check-in (cliente) e Balcão (lojista) passam por aqui, então
 * antifraude, boas-vindas e cache do cartão não têm duas implementações. Sempre dentro de uma
 * transação que o chamador abre: o cartão é travado, o ledger recebe as linhas e o saldo (cache)
 * muda junto.
 */
@Injectable()
export class LedgerStore {
  /**
   * Devolve o cartão da pessoa nesta loja travado (`FOR UPDATE`), criando-o se for a primeira
   * vez. Duas requisições simultâneas se enfileiram aqui: a segunda enxerga o que a primeira gravou.
   */
  async lockOrCreateCard(tx: Tx, key: CardKey): Promise<{ card: LockedCard; created: boolean }> {
    const inserted = await tx
      .insert(loyaltyCards)
      .values(key)
      .onConflictDoNothing({ target: [loyaltyCards.shopId, loyaltyCards.customerId] })
      .returning({ id: loyaltyCards.id })

    const [card] = await tx
      .select({
        id: loyaltyCards.id,
        balance: loyaltyCards.balance,
        lastVisitAt: loyaltyCards.lastVisitAt,
        rewardExpiresAt: loyaltyCards.rewardExpiresAt,
      })
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, key.shopId), eq(loyaltyCards.customerId, key.customerId)))
      .for('update')
    if (!card) throw new Error('Card vanished after upsert')
    return { card, created: inserted.length > 0 }
  }

  /**
   * Grava boas-vindas (se houver) e a visita, e atualiza o cartão. As boas-vindas entram primeiro:
   * as duas linhas têm o mesmo instante e o `id` (UUID v7) desempata, deixando as boas-vindas nas
   * primeiras casas do cartão. Devolve o id da linha da visita.
   */
  async credit(tx: Tx, command: CreditCommand): Promise<{ entryId: string }> {
    const { card, plan } = command
    // O relógio é o da aplicação, lido antes de esperar o lock: sob o lock nunca recua em relação
    // ao último lançamento do cartão (senão `lastVisitAt` regride e a ordem do ledger inverte).
    const now = card.lastVisitAt !== null && card.lastVisitAt > command.now ? card.lastVisitAt : command.now
    const common = { cardId: card.id, shopId: command.shopId, customerId: command.customerId, occurredAt: now }

    if (plan.welcomeUnits > 0) {
      await tx.insert(ledgerEntries).values({
        ...common,
        kind: 'welcomeBonus',
        unitsDelta: plan.welcomeUnits,
        countsAsVisit: false,
        idempotencyKey: `welcome:${card.id}`,
      })
    }
    const [visit] = await tx
      .insert(ledgerEntries)
      .values({
        ...common,
        kind: command.kind,
        unitsDelta: plan.units,
        amountCents: command.amountCents ?? null,
        countsAsVisit: true,
        recordedBy: command.recordedBy ?? null,
        idempotencyKey: command.idempotencyKey,
      })
      .returning({ id: ledgerEntries.id })
    if (!visit) throw new Error('Ledger insert returned no row')

    await tx
      .update(loyaltyCards)
      .set({ balance: plan.balanceAfter, lastVisitAt: now, rewardExpiresAt: plan.rewardExpiresAt })
      .where(eq(loyaltyCards.id, card.id))
    return { entryId: visit.id }
  }

  /**
   * Entrega do prêmio no Balcão: debita a meta do cartão, marca o código como `redeemed` e, se a regra
   * de boas-vindas estiver ligada, o cartão já recomeça andado. Trava cartão e código; repetir a
   * validação do mesmo código dá `redemptionAlreadyUsed`, nunca um segundo débito.
   */
  async settleRedemption(tx: Tx, command: SettleCommand): Promise<Result<SettledRedemption, SettleError>> {
    const [row] = await tx
      .select({
        redemptionId: redemptions.id,
        redemptionShopId: redemptions.shopId,
        status: redemptions.status,
        expiresAt: redemptions.expiresAt,
        cardId: loyaltyCards.id,
        customerId: loyaltyCards.customerId,
        balance: loyaltyCards.balance,
        target: programs.target,
        bonusRules: programs.bonusRules,
      })
      .from(redemptions)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .where(eq(redemptions.id, command.redemptionId))
      .for('update', { of: [loyaltyCards, redemptions] })
    if (!row || row.redemptionShopId !== command.shopId) return err({ code: 'redemptionInvalid' })
    if (row.status === 'redeemed') return err({ code: 'redemptionAlreadyUsed' })
    if (row.status === 'expired') return err({ code: 'redemptionExpired' })
    if (row.expiresAt <= command.now) {
      await tx.update(redemptions).set({ status: 'expired' }).where(eq(redemptions.id, row.redemptionId))
      return err({ code: 'redemptionExpired' })
    }

    const bonusRules = BonusRulesSchema.safeParse(row.bonusRules)
    const welcome = bonusRules.success ? welcomeUnits(bonusRules.data) : 0
    const balanceAfter = Math.max(0, row.balance - row.target) + welcome
    const common = { cardId: row.cardId, shopId: command.shopId, customerId: row.customerId, occurredAt: command.now, countsAsVisit: false }

    await tx.insert(ledgerEntries).values({
      ...common,
      kind: 'redemption',
      unitsDelta: -row.target,
      recordedBy: command.recordedBy,
      redemptionId: row.redemptionId,
      idempotencyKey: `redemption:${row.redemptionId}`,
    })
    if (welcome > 0) {
      await tx.insert(ledgerEntries).values({
        ...common,
        kind: 'welcomeBonus',
        unitsDelta: welcome,
        idempotencyKey: `welcome-restart:${row.redemptionId}`,
      })
    }
    await tx
      .update(loyaltyCards)
      .set({ balance: balanceAfter, rewardExpiresAt: balanceAfter >= row.target ? addDays(command.now, REWARD_HOLD_DAYS) : null })
      .where(eq(loyaltyCards.id, row.cardId))
    await tx
      .update(redemptions)
      .set({ status: 'redeemed', redeemedAt: command.now, redeemedBy: command.recordedBy })
      .where(eq(redemptions.id, row.redemptionId))

    return ok({ cardId: row.cardId, customerId: row.customerId, target: row.target, balanceAfter, welcomeUnits: welcome })
  }
}
