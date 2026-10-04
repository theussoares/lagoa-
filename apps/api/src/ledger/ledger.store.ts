import { Injectable, Logger } from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'
import { welcomeUnits } from '#shared/domain/bonusRules'
import type { EarningPlan } from '#shared/domain/earning'
import { planExpiration } from '#shared/domain/expiration'
import { REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { BonusRulesSchema, type ExpirationPolicy } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { addDays } from '#shared/utils/time'
import type { Tx } from '../database/database.module'
import { ledgerEntries, loyaltyCards, programs, redemptions, shops } from '../database/schema'
import { toExpirationPolicy } from '../programs/program-rules.mapper'

export interface LockedCard {
  readonly id: string
  readonly shopId: string
  readonly customerId: string
  readonly balance: number
  readonly lastVisitAt: Date | null
  readonly lastActivityAt: Date | null
  readonly rewardExpiresAt: Date | null
}

export interface CardKey {
  readonly shopId: string
  readonly customerId: string
  readonly programId: string
}

/** O que a loja diz sobre vencimento: com isso o cartão sai da trava já em dia. */
export interface ExpiryContext {
  readonly policy: ExpirationPolicy
  readonly target: number
  readonly now: Date
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

export interface BonusCommand {
  /** Cartão travado de quem recebe, já com o vencimento aplicado (`lockOrCreateCard`). */
  readonly card: LockedCard
  readonly target: number
  readonly units: number
  readonly kind: 'referralBonus'
  readonly now: Date
  readonly idempotencyKey: string
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

export type SettleError =
  | ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>
  | ErrorOf<'rewardNotReady'>
  | ErrorOf<'shopPendingApproval' | 'shopSuspended'>

/** O instante nunca recua em relação ao último lançamento do cartão (a ordem da caderneta não inverte). */
const laterOf = (last: Date | undefined, requested: Date): Date => (last !== undefined && last > requested ? last : requested)

/**
 * Única porta de escrita do ledger. Check-in (cliente) e Balcão (lojista) passam por aqui, então
 * antifraude, boas-vindas e cache do cartão não têm duas implementações. Sempre dentro de uma
 * transação que o chamador abre: o cartão é travado, o ledger recebe as linhas e o saldo (cache)
 * muda junto.
 */
@Injectable()
export class LedgerStore {
  private readonly logger = new Logger(LedgerStore.name)

  /**
   * Devolve o cartão da pessoa nesta loja travado (`FOR UPDATE`), criando-o se for a primeira
   * vez. Duas requisições simultâneas se enfileiram aqui: a segunda enxerga o que a primeira gravou.
   * O vencimento já vem aplicado (`expireIfDue`): nenhum lançamento, de quem quer que seja, credita
   * em cima de saldo que deveria ter vencido.
   */
  async lockOrCreateCard(tx: Tx, key: CardKey, expiry: ExpiryContext): Promise<{ card: LockedCard; created: boolean }> {
    const inserted = await tx
      .insert(loyaltyCards)
      .values(key)
      .onConflictDoNothing({ target: [loyaltyCards.shopId, loyaltyCards.customerId] })
      .returning({ id: loyaltyCards.id })

    const [card] = await tx
      .select({
        id: loyaltyCards.id,
        shopId: loyaltyCards.shopId,
        customerId: loyaltyCards.customerId,
        balance: loyaltyCards.balance,
        lastVisitAt: loyaltyCards.lastVisitAt,
        lastActivityAt: loyaltyCards.lastActivityAt,
        rewardExpiresAt: loyaltyCards.rewardExpiresAt,
      })
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, key.shopId), eq(loyaltyCards.customerId, key.customerId)))
      .for('update')
    if (!card) throw new Error('Card vanished after upsert')
    return { card: await this.expireIfDue(tx, card, expiry), created: inserted.length > 0 }
  }

  /**
   * Grava o que venceu no cartão (linha `expiration` no ledger, saldo e prazo do prêmio) e devolve o cartão
   * em dia. A chave `expiration:<cartão>:<tipo>:<quando venceu>` impede gravar o mesmo vencimento duas vezes.
   * Cartão travado pelo chamador.
   */
  async expireIfDue(tx: Tx, card: LockedCard, expiry: ExpiryContext): Promise<LockedCard> {
    const plan = planExpiration(card, expiry.policy, expiry.target, expiry.now)
    if (plan === null) return card

    const last = await this.lastEntry(tx, card.id)
    await tx.insert(ledgerEntries).values({
      cardId: card.id,
      shopId: card.shopId,
      customerId: card.customerId,
      kind: 'expiration',
      unitsDelta: -plan.unitsLost,
      countsAsVisit: false,
      occurredAt: laterOf(last?.occurredAt, plan.dueAt),
      // A última linha do cartão faz parte da chave: o mesmo vencimento pode se repetir depois de um bônus.
      idempotencyKey: `expiration:${card.id}:${plan.kind}:${plan.dueAt.toISOString()}:${last?.id ?? 'none'}`,
    })
    await tx
      .update(loyaltyCards)
      .set({ balance: plan.balanceAfter, rewardExpiresAt: plan.rewardExpiresAt })
      .where(eq(loyaltyCards.id, card.id))
    return { ...card, balance: plan.balanceAfter, rewardExpiresAt: plan.rewardExpiresAt }
  }

  /**
   * Grava boas-vindas (se houver) e a visita, e atualiza o cartão. As boas-vindas entram primeiro:
   * as duas linhas têm o mesmo instante e o `id` (UUID v7) desempata, deixando as boas-vindas nas
   * primeiras casas do cartão. Devolve o id da linha da visita.
   */
  async credit(tx: Tx, command: CreditCommand): Promise<{ entryId: string }> {
    const { card, plan } = command
    const now = await this.instantFor(tx, card.id, command.now)
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
      .set({ balance: plan.balanceAfter, lastVisitAt: now, lastActivityAt: now, rewardExpiresAt: plan.rewardExpiresAt })
      .where(eq(loyaltyCards.id, card.id))
    return { entryId: visit.id }
  }

  /**
   * Crédito sem visita (hoje, o bônus de indicação): soma ao saldo e conta como atividade (adia a
   * inatividade), mas não mexe em `lastVisitAt`, então não segura o check-in de quem recebeu.
   */
  async creditBonus(tx: Tx, command: BonusCommand): Promise<{ entryId: string; balanceAfter: number }> {
    const { card } = command
    const now = await this.instantFor(tx, card.id, command.now)
    const [entry] = await tx
      .insert(ledgerEntries)
      .values({
        cardId: card.id,
        shopId: card.shopId,
        customerId: card.customerId,
        kind: command.kind,
        unitsDelta: command.units,
        countsAsVisit: false,
        occurredAt: now,
        idempotencyKey: command.idempotencyKey,
      })
      .returning({ id: ledgerEntries.id })
    if (!entry) throw new Error('Ledger insert returned no row')

    const balanceAfter = card.balance + command.units
    const rewardExpiresAt = card.rewardExpiresAt ?? (balanceAfter >= command.target ? addDays(now, REWARD_HOLD_DAYS) : null)
    await tx.update(loyaltyCards).set({ balance: balanceAfter, lastActivityAt: now, rewardExpiresAt }).where(eq(loyaltyCards.id, card.id))
    return { entryId: entry.id, balanceAfter }
  }

  /**
   * Entrega do prêmio no Balcão: debita a meta do cartão, marca o código como `redeemed` e, se a regra
   * de boas-vindas estiver ligada, o cartão já recomeça andado. Trava cartão e código; repetir a
   * validação do mesmo código dá `redemptionAlreadyUsed`, nunca um segundo débito.
   *
   * Quem chama garante o que o banco não sabe: que `recordedBy` é dono (ou equipe) de `shopId` e que a
   * transação foi aberta por ele. Aqui se confere a loja do código, a situação da loja, o vencimento e
   * que o cartão ainda tem a meta (ela pode ter subido depois do pedido do código).
   *
   * Recusas `redemptionExpired` e `rewardNotReady` marcam o código como `expired`: quem chama deve
   * confirmar (commit) a transação nesses casos, não desfazê-la, senão a marcação se perde.
   */
  async settleRedemption(tx: Tx, command: SettleCommand): Promise<Result<SettledRedemption, SettleError>> {
    const [row] = await tx
      .select({
        redemptionId: redemptions.id,
        redemptionShopId: redemptions.shopId,
        status: redemptions.status,
        expiresAt: redemptions.expiresAt,
        shopStatus: shops.status,
        cardId: loyaltyCards.id,
        customerId: loyaltyCards.customerId,
        balance: loyaltyCards.balance,
        lastVisitAt: loyaltyCards.lastVisitAt,
        lastActivityAt: loyaltyCards.lastActivityAt,
        rewardExpiresAt: loyaltyCards.rewardExpiresAt,
        target: programs.target,
        bonusRules: programs.bonusRules,
        expirationKind: programs.expirationKind,
        expirationMonths: programs.expirationMonths,
      })
      .from(redemptions)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(shops, eq(shops.id, redemptions.shopId))
      .where(eq(redemptions.id, command.redemptionId))
      .for('update', { of: [loyaltyCards, redemptions] })
    if (!row || row.redemptionShopId !== command.shopId) return err({ code: 'redemptionInvalid' })
    if (row.status === 'redeemed') return err({ code: 'redemptionAlreadyUsed' })
    if (row.status === 'expired') return err({ code: 'redemptionExpired' })
    if (row.shopStatus === 'pending') return err({ code: 'shopPendingApproval' })
    if (row.shopStatus === 'suspended') return err({ code: 'shopSuspended' })
    if (row.expiresAt <= command.now) {
      await tx.update(redemptions).set({ status: 'expired' }).where(eq(redemptions.id, row.redemptionId))
      return err({ code: 'redemptionExpired' })
    }
    // O prêmio pode ter vencido enquanto o código estava no ar; o cartão entra em dia antes da conta.
    const policy = toExpirationPolicy(row)
    const locked: LockedCard = { id: row.cardId, shopId: command.shopId, customerId: row.customerId, balance: row.balance, lastVisitAt: row.lastVisitAt, lastActivityAt: row.lastActivityAt, rewardExpiresAt: row.rewardExpiresAt }
    if (!policy.ok) this.logger.warn(`Card ${row.cardId}: invalid expiration policy, skipping expiry`)
    const card = policy.ok ? await this.expireIfDue(tx, locked, { policy: policy.value, target: row.target, now: command.now }) : locked
    if (card.balance < row.target) {
      // A meta subiu ou o prêmio venceu depois do pedido: o código deixa de valer e a entrega não debita.
      await tx.update(redemptions).set({ status: 'expired' }).where(eq(redemptions.id, row.redemptionId))
      return err({ code: 'rewardNotReady', remaining: row.target - card.balance })
    }

    const welcome = this.welcomeUnitsOf(row.bonusRules, command.shopId)
    const balanceAfter = card.balance - row.target + welcome
    const now = await this.instantFor(tx, row.cardId, command.now)
    const common = { cardId: row.cardId, shopId: command.shopId, customerId: row.customerId, occurredAt: now, countsAsVisit: false }

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
      .set({ balance: balanceAfter, rewardExpiresAt: balanceAfter >= row.target ? addDays(now, REWARD_HOLD_DAYS) : null })
      .where(eq(loyaltyCards.id, row.cardId))
    await tx
      .update(redemptions)
      .set({ status: 'redeemed', redeemedAt: now, redeemedBy: command.recordedBy })
      .where(eq(redemptions.id, row.redemptionId))

    return ok({ cardId: row.cardId, customerId: row.customerId, target: row.target, balanceAfter, welcomeUnits: welcome })
  }

  /**
   * O relógio é o da aplicação, lido antes de esperar o lock; sob o lock o instante nunca recua em
   * relação ao último lançamento do cartão (senão a ordem da caderneta inverte). Mesma regra para
   * visita e resgate; a leitura é um passo no índice (card_id, occurred_at DESC, id DESC).
   */
  private async instantFor(tx: Tx, cardId: string, requested: Date): Promise<Date> {
    return laterOf((await this.lastEntry(tx, cardId))?.occurredAt, requested)
  }

  private async lastEntry(tx: Tx, cardId: string): Promise<{ id: string; occurredAt: Date } | undefined> {
    const [last] = await tx
      .select({ id: ledgerEntries.id, occurredAt: ledgerEntries.occurredAt })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.cardId, cardId))
      .orderBy(sql`${ledgerEntries.occurredAt} desc nulls last`, sql`${ledgerEntries.id} desc nulls last`)
      .limit(1)
    return last
  }

  private welcomeUnitsOf(rawBonusRules: unknown, shopId: string): number {
    const bonusRules = BonusRulesSchema.safeParse(rawBonusRules)
    if (bonusRules.success) return welcomeUnits(bonusRules.data)
    this.logger.warn(`Shop ${shopId}: invalid bonus rules, restarting the card without welcome units`)
    return 0
  }
}
