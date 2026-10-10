import { Inject, Injectable } from '@nestjs/common'
import { and, eq, lt, lte, or, sql } from 'drizzle-orm'
import { CHECK_IN_COOLDOWN_MAX_HOURS } from '#shared/constants/domain'
import { VisitQrEarnSchema } from '#shared/schemas/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import type { Tx } from '../../database/database.module'
import { customerProfiles, ledgerEntries, loyaltyCards, programs, shops, visitQrs } from '../../database/schema'
import { type LockedCard, LedgerStore } from '../../ledger/ledger.store'
import { carriesOverFromPerReal } from '../../ledger/per-real-carry-over'
import { toExpirationPolicy } from '../../programs/program-rules.mapper'
import { CATALOG_COLUMNS, toCatalogShop } from '../../shops/catalog-row'
import {
  CheckInRepository,
  type LockedVisitQr,
  ProgramVersionChanged,
  type VisitClaimDeciders,
  type VisitClaimRecorded,
  type VisitQrLookup,
  type VisitQrTarget,
} from './check-in.repository'

/** Desfaz a transação quando uma regra recusa; o erro de domínio sai pelo `refusal`, não pela exceção. */
class RollbackSignal extends Error {}

@Injectable()
export class DrizzleCheckInRepository extends CheckInRepository {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly ledger: LedgerStore,
  ) {
    super()
  }

  /**
   * A busca do QR (loja aprovada e programa ativo na mesma consulta). Pública para o teste de `EXPLAIN` provar o
   * índice com a mesma consulta que roda de verdade. Pelo código curto: a linha mais nova, com `nulls last` para o
   * planner usar o índice `(visit_code, created_at DESC)`.
   */
  lookupQuery(lookup: VisitQrLookup) {
    const query = this.db
      .select({
        visitQrId: visitQrs.id,
        shopId: visitQrs.shopId,
        issuedBy: visitQrs.issuedBy,
        earnKind: visitQrs.earnKind,
        amountCents: visitQrs.amountCents,
        activeProgramId: programs.id,
        cooldownHours: programs.checkInCooldownHours,
      })
      .from(visitQrs)
      .innerJoin(shops, and(eq(shops.id, visitQrs.shopId), eq(shops.status, 'approved')))
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .$dynamic()
    // O token é único; só o código curto pode repetir entre linhas antigas, e vale a mais nova. O reenvio por código
    // também não tem janela de validade: só quem já usou o QR recebe de volta o ganho dele (`decideQrUse`), e isso
    // vale tanto pelo token quanto pelo código, para o app que perdeu a resposta poder tentar outra vez.
    return lookup.kind === 'tokenHash'
      ? query.where(eq(visitQrs.tokenHash, lookup.tokenHash)).limit(1)
      : query.where(eq(visitQrs.visitCode, lookup.code)).orderBy(sql`${visitQrs.createdAt} desc nulls last`).limit(1)
  }

  async findVisitQr(lookup: VisitQrLookup, customerId: string): Promise<VisitQrTarget | null> {
    const [row] = await this.lookupQuery(lookup)
    if (!row) return null
    // Janela fora de 1..168 h (o CHECK do banco já barra): a loja fica de fora, nunca com ganho ilimitado.
    if (row.cooldownHours < 1 || row.cooldownHours > CHECK_IN_COOLDOWN_MAX_HOURS) return null
    const earn = VisitQrEarnSchema.safeParse(row.earnKind === 'amount' ? { kind: 'amount', amountCents: row.amountCents } : { kind: 'visit' })
    if (!earn.success) return null

    // Cartão com saldo segue na versão do programa em que nasceu; sem cartão (ou zerado) vale a versão ativa.
    const [card] = await this.db
      .select({ programId: loyaltyCards.programId, balance: loyaltyCards.balance, earnPer: programs.earnPer, unit: programs.unit, target: programs.target })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .where(and(eq(loyaltyCards.shopId, row.shopId), eq(loyaltyCards.customerId, customerId)))
      .limit(1)
    const programId = card && card.balance > 0 && !(await this.carriesOver(card, row.activeProgramId)) ? card.programId : row.activeProgramId
    const [catalog] = await this.db
      .select(CATALOG_COLUMNS)
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.id, programId)))
      .where(eq(shops.id, row.shopId))
      .limit(1)
    const shop = catalog ? toCatalogShop(catalog) : null
    if (shop === null) return null
    return { visitQrId: row.visitQrId, shop, programId, cooldownHours: row.cooldownHours, issuedBy: row.issuedBy, earn: earn.data }
  }

  async claim<E>(
    { customerId, target, now }: { readonly customerId: string; readonly target: VisitQrTarget; readonly now: Date },
    decide: VisitClaimDeciders<E>,
  ): Promise<Result<VisitClaimRecorded, E | ErrorOf<'unauthorized'>>> {
    const refusal: { error: E | ErrorOf<'unauthorized'> | null } = { error: null }
    const refuse = (error: E | ErrorOf<'unauthorized'>): never => {
      refusal.error = error
      throw new RollbackSignal()
    }
    try {
      return await this.db.transaction(async (tx) => {
        // Ordem de locks: loja (KEY SHARE), QR, cartão. O `PUT /program` trava a loja `FOR UPDATE` e depois os QRs; sem travar a
        // loja primeiro aqui, usar o QR enquanto o lojista salva o programa dava deadlock (um dos dois levava 500).
        await tx.execute(sql`select id from shops where id = (select shop_id from visit_qrs where id = ${target.visitQrId}) for key share`)
        const qr = await this.lockVisitQr(tx, target.visitQrId)
        const use = decide.qr(qr)
        if (!use.ok) return refuse(use.error)
        if (use.value === 'replay') return ok(await this.recorded(tx, qr))

        const [profile] = await tx
          .select({ birthday: customerProfiles.birthday })
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, customerId))
          .limit(1)
        if (!profile) return refuse({ code: 'unauthorized' })

        const locked = await this.ledger.lockOrCreateCard(
          tx,
          { shopId: target.shop.id, customerId, programId: target.programId },
          { policy: target.shop.program.expiration, target: target.shop.program.rules.target, now },
        )
        const card = await this.alignProgramVersion(tx, locked.card, target.programId, now)

        const decision = decide.earning({
          card: { balance: card.balance, rewardExpiresAt: card.rewardExpiresAt, lastVisitAt: card.lastVisitAt },
          birthday: profile.birthday,
        })
        if (!decision.ok) return refuse(decision.error)

        // Segundo cadeado do uso único: a chave é única no ledger, mesmo que o lock do QR falhasse.
        const { entryId, recordedAt } = await this.ledger.credit(tx, {
          card,
          shopId: target.shop.id,
          customerId,
          plan: decision.value,
          kind: target.earn.kind,
          now,
          idempotencyKey: `visit-qr:${target.visitQrId}`,
          recordedBy: target.issuedBy,
          amountCents: target.earn.kind === 'amount' ? target.earn.amountCents : null,
        })
        await tx
          .update(visitQrs)
          .set({ status: 'claimed', claimedBy: customerId, claimedAt: now, ledgerEntryId: entryId })
          .where(eq(visitQrs.id, target.visitQrId))
        return ok({
          cardId: card.id,
          entryId,
          units: decision.value.units,
          balanceAfter: decision.value.balanceAfter,
          recordedAt,
          replayed: false,
        })
      })
    } catch (error) {
      if (error instanceof RollbackSignal && refusal.error !== null) return err(refusal.error)
      throw error
    }
  }

  async noteRefusal(visitQrId: string, refusal: { readonly availableAt: Date; readonly refusedAt: Date }): Promise<void> {
    await this.db
      .update(visitQrs)
      .set({ refusedAt: refusal.refusedAt, refusalAvailableAt: refusal.availableAt })
      .where(and(eq(visitQrs.id, visitQrId), eq(visitQrs.status, 'active')))
  }

  /** O lock do QR (só a linha dele) com o que a decisão precisa da loja agora. Pública para o `EXPLAIN`. */
  lockQuery(executor: Pick<Tx, 'select'>, visitQrId: string) {
    return executor
      .select({
        status: visitQrs.status,
        cancelReason: visitQrs.cancelReason,
        expiresAt: visitQrs.expiresAt,
        claimedBy: visitQrs.claimedBy,
        issuedBy: visitQrs.issuedBy,
        shopOwnerId: shops.ownerUserId,
        claimedAt: visitQrs.claimedAt,
        ledgerEntryId: visitQrs.ledgerEntryId,
        programId: visitQrs.programId,
        shopStatus: shops.status,
        activeProgramId: programs.id,
      })
      .from(visitQrs)
      .innerJoin(shops, eq(shops.id, visitQrs.shopId))
      .leftJoin(programs, and(eq(programs.shopId, visitQrs.shopId), eq(programs.active, true)))
      .where(eq(visitQrs.id, visitQrId))
      .for('update', { of: [visitQrs] })
  }

  private async lockVisitQr(tx: Tx, visitQrId: string): Promise<LockedVisitQr> {
    const [row] = await this.lockQuery(tx, visitQrId)
    if (!row) throw new Error('Visit QR vanished after lookup')
    const { shopStatus, ...qr } = row
    return { ...qr, shopApproved: shopStatus === 'approved' }
  }

  /**
   * Replay: o ganho que já está no ledger, sem escrever nada. Saldo e instante são os daquele lançamento (soma do
   * ledger do cartão até ele, boas-vindas do mesmo instante inclusas), não os de agora: a resposta repetida é igual
   * à primeira mesmo que o cartão tenha andado depois.
   */
  private async recorded(tx: Tx, qr: LockedVisitQr): Promise<VisitClaimRecorded> {
    if (qr.ledgerEntryId === null) throw new Error('Claimed visit QR without a ledger entry')
    const [entry] = await tx
      .select({ id: ledgerEntries.id, cardId: ledgerEntries.cardId, units: ledgerEntries.unitsDelta, occurredAt: ledgerEntries.occurredAt })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.id, qr.ledgerEntryId))
      .limit(1)
    if (!entry) throw new Error('Ledger entry of a claimed visit QR not found')
    const [upTo] = await tx
      .select({ balance: sql<number>`coalesce(sum(${ledgerEntries.unitsDelta}), 0)::int` })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.cardId, entry.cardId),
          or(lt(ledgerEntries.occurredAt, entry.occurredAt), and(eq(ledgerEntries.occurredAt, entry.occurredAt), lte(ledgerEntries.id, entry.id))),
        ),
      )
    return {
      cardId: entry.cardId,
      entryId: entry.id,
      units: entry.units,
      balanceAfter: upTo?.balance ?? 0,
      recordedAt: entry.occurredAt,
      replayed: true,
    }
  }

  /**
   * `findVisitQr` leu a versão do programa antes do lock. Cartão zerado pode mudar para a versão ativa;
   * com saldo, uma versão diferente da lida significa que o programa mudou no meio do caminho.
   */
  private async carriesOver(card: { balance: number; earnPer: string; unit: string; target: number }, activeProgramId: string): Promise<boolean> {
    const [active] = await this.db.select({ earnPer: programs.earnPer, unit: programs.unit, target: programs.target }).from(programs).where(eq(programs.id, activeProgramId)).limit(1)
    return active !== undefined && carriesOverFromPerReal(card.balance, card, active)
  }

  /**
   * Cartão zerado vai para a versão ativa; cartão por real sem prêmio ganho também (`carriesOverFromPerReal`), com o
   * vencimento da versão em que ele estava aplicado antes de mudar de versão. Outro caso é troca no meio do caminho.
   */
  private async alignProgramVersion(tx: Tx, card: LockedCard, expectedProgramId: string, now: Date): Promise<LockedCard> {
    const [current] = await tx
      .select({ programId: loyaltyCards.programId, earnPer: programs.earnPer, unit: programs.unit, target: programs.target, expirationKind: programs.expirationKind, expirationMonths: programs.expirationMonths })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .where(eq(loyaltyCards.id, card.id))
      .limit(1)
    if (!current || current.programId === expectedProgramId) return card
    const [expected] = await tx.select({ active: programs.active, earnPer: programs.earnPer, unit: programs.unit, target: programs.target }).from(programs).where(eq(programs.id, expectedProgramId)).limit(1)
    if (!expected?.active) throw new ProgramVersionChanged()
    let aligned = card
    if (card.balance > 0) {
      if (!carriesOverFromPerReal(card.balance, current, expected)) throw new ProgramVersionChanged()
      const policy = toExpirationPolicy(current)
      if (policy.ok) aligned = await this.ledger.expireIfDue(tx, card, { policy: policy.value, target: current.target, now })
    }
    await tx.update(loyaltyCards).set({ programId: expectedProgramId, ...(aligned.balance > 0 && { rewardExpiresAt: null }) }).where(eq(loyaltyCards.id, card.id))
    return aligned.balance > 0 ? { ...aligned, rewardExpiresAt: null } : aligned
  }
}
