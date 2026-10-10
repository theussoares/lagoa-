import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq, gt, lt, lte, sql } from 'drizzle-orm'
import { VISIT_QR_ACTIVE_MAX_PER_SHOP } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import type {
  VisitQr,
  VisitQrCancelReason,
  VisitQrEarn,
  VisitQrRefusal,
  VisitQrStatus,
} from '#shared/schemas/visitQr'
import { VisitQrSchema } from '#shared/schemas/visitQr'
import type { CounterEntry } from '#shared/schemas/visit'
import { CounterEntrySchema, VisitRegisteredSchema } from '#shared/schemas/visit'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database, type Tx } from '../../database/database.module'
import { uniqueViolationConstraint } from '../../database/unique-violation'
import {
  appUsers,
  ledgerEntries,
  loyaltyCards,
  programs,
  redemptions,
  shops,
  visitQrs,
} from '../../database/schema'
import { toProgramRules } from '../../programs/program-rules.mapper'
import { type IssueError, type IssuedRow, type IssueVisitQrCommand, VisitQrsRepository } from './visit-qrs.repository'

/** Primeiro inteiro da chave do advisory lock das emissões (o segundo é o hash da loja); só a variante de transação. */
const ISSUE_LOCK_NAMESPACE = 0x51
const VISIT_CODE_INSERT_ATTEMPTS = 8

@Injectable()
export class DrizzleVisitQrsRepository extends VisitQrsRepository {
  private readonly logger = new Logger(DrizzleVisitQrsRepository.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly pii: PiiService,
  ) {
    super()
  }

  async issue(command: IssueVisitQrCommand): Promise<Result<IssuedRow, IssueError>> {
    return this.db.transaction(async (tx) => {
      // 1. A loja primeiro, sozinha: `FOR SHARE` espera um `PUT /program` em andamento terminar. Lida em outro comando,
      // a versão ativa já é a nova (um join travado reavaliaria a linha antiga e devolveria nada).
      const [shop] = await tx.select({ status: shops.status }).from(shops).where(eq(shops.id, command.shopId)).for('share')
      if (!shop) return err({ code: 'notFound', entity: 'shop' })
      const [program] = await tx
        .select({ id: programs.id, mode: programs.mode, earnUnits: programs.earnUnits, target: programs.target })
        .from(programs)
        .where(and(eq(programs.shopId, command.shopId), eq(programs.active, true)))
        .limit(1)
        .for('share')
      const rules = program ? toProgramRules(program) : null
      if (!program || rules === null || !rules.ok) return err({ code: 'notFound', entity: 'program' })

      const planned = command.plan({ status: shop.status, programId: program.id, rules: rules.value })
      if (!planned.ok) return planned

      // 2. Emissões da mesma loja entram em fila: sem isso duas contam 19 ao mesmo tempo e gravam 21.
      await tx.execute(sql`select pg_advisory_xact_lock(${ISSUE_LOCK_NAMESPACE}, hashtext(${command.shopId}))`)
      // 3. O que já passou do prazo sai da conta (e libera o código curto) antes de contar.
      await tx
        .update(visitQrs)
        .set({ status: 'expired' })
        .where(and(eq(visitQrs.shopId, command.shopId), eq(visitQrs.status, 'active'), lte(visitQrs.expiresAt, command.now)))
      const [active] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(visitQrs)
        .where(and(eq(visitQrs.shopId, command.shopId), eq(visitQrs.status, 'active')))
      if ((active?.n ?? 0) >= VISIT_QR_ACTIVE_MAX_PER_SHOP) return err({ code: 'visitQrLimitReached' })

      const inserted = await this.insertWithFreeCode(tx, command, program.id, planned.value)
      return ok({ ...inserted, earn: planned.value })
    })
  }

  /**
   * O código curto é único entre os QRs vivos da rede. A colisão aborta o comando no Postgres, então o insert roda num
   * savepoint (transação aninhada): perder a corrida não derruba a emissão. Linha vencida que ainda segura o código é
   * baixada para `expired`; as vivas de outras lojas só obrigam a sortear outro.
   */
  private async insertWithFreeCode(
    tx: Tx,
    command: IssueVisitQrCommand,
    programId: string,
    earn: VisitQrEarn,
  ): Promise<{ id: string; visitCode: string }> {
    for (let attempt = 0; attempt < VISIT_CODE_INSERT_ATTEMPTS; attempt++) {
      const visitCode = command.newVisitCode()
      try {
        const [row] = await tx.transaction((savepoint) =>
          savepoint
            .insert(visitQrs)
            .values({
              shopId: command.shopId,
              programId,
              issuedBy: command.issuedBy,
              tokenHash: command.tokenHash,
              visitCode,
              earnKind: earn.kind,
              amountCents: earn.kind === 'amount' ? earn.amountCents : null,
              status: 'active',
              createdAt: command.now,
              expiresAt: command.expiresAt,
            })
            .returning({ id: visitQrs.id }),
        )
        if (row) return { id: row.id, visitCode }
      } catch (error) {
        if (uniqueViolationConstraint(error) !== 'visit_qrs_active_code_uq') throw error
        await tx
          .update(visitQrs)
          .set({ status: 'expired' })
          .where(and(eq(visitQrs.visitCode, visitCode), eq(visitQrs.status, 'active'), lte(visitQrs.expiresAt, command.now)))
      }
    }
    throw new Error('Could not allocate a free visit code')
  }

  async findById(shopId: string, id: string): Promise<VisitQr | null> {
    const [row] = await this.db
      .select({
        id: visitQrs.id,
        visitCode: visitQrs.visitCode,
        status: visitQrs.status,
        earnKind: visitQrs.earnKind,
        amountCents: visitQrs.amountCents,
        createdAt: visitQrs.createdAt,
        expiresAt: visitQrs.expiresAt,
        refusedAt: visitQrs.refusedAt,
        refusalAvailableAt: visitQrs.refusalAvailableAt,
        claimedAt: visitQrs.claimedAt,
        ledgerEntryId: visitQrs.ledgerEntryId,
      })
      .from(visitQrs)
      .where(and(eq(visitQrs.id, id), eq(visitQrs.shopId, shopId)))
      .limit(1)

    if (!row) return null

    const earn: VisitQrEarn =
      row.earnKind === 'amount' && row.amountCents !== null
        ? { kind: 'amount', amountCents: row.amountCents }
        : { kind: 'visit' }

    let refusal: VisitQrRefusal | null = null
    if (row.refusedAt && row.refusalAvailableAt) {
      refusal = {
        code: 'checkInCooldown',
        availableAt: toIso(row.refusalAvailableAt),
        refusedAt: toIso(row.refusedAt),
      }
    }

    let claim: ReturnType<typeof VisitRegisteredSchema.parse> | null = null
    if (row.status === 'claimed' && row.ledgerEntryId) {
      claim = await this.resolveClaim(shopId, row.ledgerEntryId)
    }

    return VisitQrSchema.parse({
      id: row.id,
      visitCode: row.visitCode,
      status: row.status as VisitQrStatus,
      earn,
      createdAt: toIso(row.createdAt),
      expiresAt: toIso(row.expiresAt),
      claim,
      refusal,
    })
  }

  async cancel(shopId: string, id: string, reason: VisitQrCancelReason, now: Date): Promise<VisitQr | null> {
    // Só o que ainda está vivo: vencido não vira `cancelled` (a situação seria falsa) e repetir não muda nada.
    await this.db
      .update(visitQrs)
      .set({ status: 'cancelled', cancelReason: reason })
      .where(and(eq(visitQrs.id, id), eq(visitQrs.shopId, shopId), eq(visitQrs.status, 'active'), gt(visitQrs.expiresAt, now)))

    return this.findById(shopId, id)
  }

  private async resolveClaim(
    shopId: string,
    ledgerEntryId: string,
  ): Promise<ReturnType<typeof VisitRegisteredSchema.parse> | null> {
    const [entryRow] = await this.db
      .select({
        id: ledgerEntries.id,
        shopId: ledgerEntries.shopId,
        cardId: ledgerEntries.cardId,
        kind: ledgerEntries.kind,
        unitsDelta: ledgerEntries.unitsDelta,
        amountCents: ledgerEntries.amountCents,
        occurredAt: ledgerEntries.occurredAt,
        phoneEncrypted: appUsers.phoneEncrypted,
        erasedAt: appUsers.erasedAt,
        rewardTitle: redemptions.rewardTitle,
        programUnit: programs.unit,
        cardBalance: loyaltyCards.balance,
        cardTarget: programs.target,
      })
      .from(ledgerEntries)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, ledgerEntries.cardId))
      .innerJoin(appUsers, eq(appUsers.id, ledgerEntries.customerId))
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .leftJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
      .where(eq(ledgerEntries.id, ledgerEntryId))
      .limit(1)

    if (!entryRow) return null

    // Conta apagada: "cliente removido". O celular dela é um buffer vazio e nunca chega a ser decifrado.
    const maskedPhone = entryRow.erasedAt === null ? this.maskedPhoneOf(entryRow.id, entryRow.phoneEncrypted) : null
    const [welcome] = await this.db
      .select({ unitsDelta: ledgerEntries.unitsDelta })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.idempotencyKey, `welcome:${entryRow.cardId}`),
          eq(ledgerEntries.occurredAt, entryRow.occurredAt),
        ),
      )
      .limit(1)
    const [earlierVisit] = await this.db
      .select({ id: ledgerEntries.id })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.cardId, entryRow.cardId),
          eq(ledgerEntries.countsAsVisit, true),
          lt(ledgerEntries.occurredAt, entryRow.occurredAt),
        ),
      )
      .limit(1)

    const entry: CounterEntry = CounterEntrySchema.parse({
      id: entryRow.id,
      shopId: entryRow.shopId,
      maskedPhone,
      kind: entryRow.kind,
      unit: entryRow.programUnit,
      units: entryRow.unitsDelta > 0 ? entryRow.unitsDelta : 0,
      amountCents: entryRow.amountCents,
      rewardTitle: entryRow.rewardTitle,
      isNewCustomer: !earlierVisit,
      createdAt: toIso(entryRow.occurredAt),
    })

    return VisitRegisteredSchema.parse({
      entry,
      card: {
        cardId: entryRow.cardId,
        unit: entryRow.programUnit,
        balance: entryRow.cardBalance,
        target: entryRow.cardTarget,
        rewardReady: entryRow.cardBalance >= entryRow.cardTarget,
      },
      unitsEarned: entryRow.unitsDelta,
      welcomeUnits: welcome?.unitsDelta ?? 0,
    })
  }

  /** Falha de cifra é erro do servidor: loga só o id do lançamento (nunca o celular) e deixa subir, em vez de mostrar um número inventado. */
  private maskedPhoneOf(entryId: string, phoneEncrypted: Buffer): ReturnType<typeof maskPhone> {
    try {
      return maskPhone(this.pii.decrypt(phoneEncrypted) as PhoneNumber)
    } catch (error) {
      this.logger.error(`Could not decrypt customer phone for ledger entry ${entryId}`)
      throw error
    }
  }
}
