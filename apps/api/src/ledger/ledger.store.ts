import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import type { EarningPlan } from '#shared/domain/earning'
import type { Tx } from '../database/database.module'
import { ledgerEntries, loyaltyCards } from '../database/schema'

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
    const { card, plan, now } = command
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
}
