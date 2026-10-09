import { Inject, Injectable, Logger } from '@nestjs/common'
import { and, eq, lt, sql } from 'drizzle-orm'
import { VISIT_CODE_LENGTH } from '#shared/constants/domain'
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
import { generateReadableCode } from '../../common/readable-code'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { DB, type Database } from '../../database/database.module'
import {
  appUsers,
  ledgerEntries,
  loyaltyCards,
  programs,
  redemptions,
  visitQrs,
} from '../../database/schema'
import { toProgramRules } from '../../programs/program-rules.mapper'
import {
  type ActiveProgramRules,
  type InsertVisitQrParams,
  VisitQrsRepository,
} from './visit-qrs.repository'

@Injectable()
export class DrizzleVisitQrsRepository extends VisitQrsRepository {
  private readonly logger = new Logger(DrizzleVisitQrsRepository.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly pii: PiiService,
  ) {
    super()
  }

  async findActiveProgram(shopId: string): Promise<ActiveProgramRules | null> {
    const [row] = await this.db
      .select({
        id: programs.id,
        mode: programs.mode,
        earnUnits: programs.earnUnits,
        target: programs.target,
      })
      .from(programs)
      .where(and(eq(programs.shopId, shopId), eq(programs.active, true)))
      .limit(1)

    if (!row) return null

    const rulesResult = toProgramRules({
      mode: row.mode,
      earnUnits: row.earnUnits,
      target: row.target,
    })
    if (!rulesResult.ok) return null

    return {
      id: row.id,
      rules: rulesResult.value,
    }
  }

  async createVisitQr(params: InsertVisitQrParams): Promise<string> {
    let visitCode = params.visitCode

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [inserted] = await this.db
          .insert(visitQrs)
          .values({
            shopId: params.shopId,
            programId: params.programId,
            issuedBy: params.issuedBy,
            tokenHash: params.tokenHash,
            visitCode,
            earnKind: params.earn.kind,
            amountCents: params.earn.kind === 'amount' ? params.earn.amountCents : null,
            status: 'active',
            createdAt: params.createdAt,
            expiresAt: params.expiresAt,
          })
          .returning({ id: visitQrs.id })

        if (inserted) return inserted.id
      } catch (err: unknown) {
        // Colisão com visit_qrs_active_code_uq:
        // Se a linha ativa anterior já expirou (expires_at <= now), desativa para 'expired' e tenta de novo.
        const pgError = err as { code?: string; constraint?: string }
        if (
          pgError.code === '23505' &&
          (pgError.constraint === 'visit_qrs_active_code_uq' ||
            String(err).includes('visit_qrs_active_code_uq'))
        ) {
          // Marca linhas vencidas como expired para liberar o código
          await this.db
            .update(visitQrs)
            .set({ status: 'expired' })
            .where(
              and(
                eq(visitQrs.visitCode, visitCode),
                eq(visitQrs.status, 'active'),
                sql`${visitQrs.expiresAt} <= ${params.createdAt}`,
              ),
            )
          visitCode = generateReadableCode(VISIT_CODE_LENGTH)
          continue
        }
        throw err
      }
    }

    throw new Error('Could not generate unique active visit code after retries')
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

  async cancel(
    shopId: string,
    id: string,
    reason: VisitQrCancelReason,
  ): Promise<VisitQr | null> {
    await this.db
      .update(visitQrs)
      .set({
        status: 'cancelled',
        cancelReason: reason,
      })
      .where(
        and(
          eq(visitQrs.id, id),
          eq(visitQrs.shopId, shopId),
          eq(visitQrs.status, 'active'),
        ),
      )

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

    const maskedPhone = this.maskedPhoneOf(entryRow.id, entryRow.phoneEncrypted)
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
