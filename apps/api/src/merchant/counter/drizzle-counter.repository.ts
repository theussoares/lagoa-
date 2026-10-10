import { Inject, Injectable, Logger } from '@nestjs/common'
import { COUNTER_TODAY_LIMIT } from '#shared/constants/domain'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { ShopIdSchema } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import { CounterEntrySchema, type CounterEntry, type CounterToday } from '#shared/schemas/visit'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { DB, type Database } from '../../database/database.module'
import { appUsers, ledgerEntries, loyaltyCards, programs, redemptions, shops } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { RedemptionLookup, type RedemptionLookupError } from '../../ledger/redemption-lookup'
import { err, ok, type Result } from '#shared/types/result'
import {
  CounterRepository,
  type ActiveRedemptionPreview,
  type SettleRedemptionError,
  type ShopWithProgram,
} from './counter.repository'

@Injectable()
export class DrizzleCounterRepository extends CounterRepository {
  private readonly logger = new Logger(DrizzleCounterRepository.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly ledger: LedgerStore,
    private readonly pii: PiiService,
    private readonly redemptionLookup: RedemptionLookup,
  ) {
    super()
  }

  async findShopAndProgramByOwner(ownerUserId: string): Promise<ShopWithProgram | null> {
    const [row] = await this.db
      .select({
        shopId: shops.id,
        shopName: shops.name,
        shopStatus: shops.status,
        programId: programs.id,
        rewardTitle: programs.rewardTitle,
        mode: programs.mode,
        unit: programs.unit,
        earnPer: programs.earnPer,
        earnUnits: programs.earnUnits,
        target: programs.target,
        bonusRules: programs.bonusRules,
        expirationKind: programs.expirationKind,
        expirationMonths: programs.expirationMonths,
        checkInCooldownHours: programs.checkInCooldownHours,
      })
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(eq(shops.ownerUserId, ownerUserId))
      .limit(1)

    return row ?? null
  }

  async listTodayEntries(shopId: string, startOfDay: Date): Promise<CounterToday> {
    const rows = await this.db
      .select({
        id: ledgerEntries.id,
        shopId: ledgerEntries.shopId,
        kind: ledgerEntries.kind,
        unitsDelta: ledgerEntries.unitsDelta,
        amountCents: ledgerEntries.amountCents,
        countsAsVisit: ledgerEntries.countsAsVisit,
        occurredAt: ledgerEntries.occurredAt,
        phoneEncrypted: appUsers.phoneEncrypted,
        erasedAt: appUsers.erasedAt,
        rewardTitle: redemptions.rewardTitle,
        programUnit: programs.unit,
        firstVisitAt: loyaltyCards.firstVisitAt,
      })
      .from(ledgerEntries)
      .innerJoin(appUsers, eq(appUsers.id, ledgerEntries.customerId))
      .leftJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, ledgerEntries.cardId))
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .where(
        and(
          eq(ledgerEntries.shopId, shopId),
          gte(ledgerEntries.occurredAt, startOfDay),
          inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn', 'redemption']),
        ),
      )
      .orderBy(sql`${ledgerEntries.occurredAt} desc nulls last`, sql`${ledgerEntries.id} desc nulls last`)
      .limit(COUNTER_TODAY_LIMIT + 1)

    const entries = rows.slice(0, COUNTER_TODAY_LIMIT).map((row) =>
      CounterEntrySchema.parse({
        id: row.id,
        shopId: row.shopId,
        maskedPhone: this.maskedPhoneOf(row.id, row.phoneEncrypted, row.erasedAt),
        kind: row.kind,
        unit: row.programUnit,
        units: row.unitsDelta > 0 ? row.unitsDelta : 0,
        amountCents: row.amountCents,
        rewardTitle: row.rewardTitle,
        // Primeira visita da pessoa nesta loja: a linha É a que gravou `first_visit_at` (mesmo instante).
        isNewCustomer: row.countsAsVisit && row.firstVisitAt !== null && row.occurredAt.getTime() === row.firstVisitAt.getTime(),
        createdAt: toIso(row.occurredAt),
      }),
    )
    return { entries, truncated: rows.length > COUNTER_TODAY_LIMIT }
  }

  /** `null` = conta apagada ("cliente removido"): o celular dela é um buffer vazio e não se decifra. Falha de cifra é erro do servidor. */
  private maskedPhoneOf(entryId: string, phoneEncrypted: Buffer, erasedAt: Date | null): ReturnType<typeof maskPhone> | null {
    return erasedAt !== null ? null : this.maskedPhone(entryId, phoneEncrypted)
  }

  private maskedPhone(entryId: string, phoneEncrypted: Buffer): ReturnType<typeof maskPhone> {
    try {
      return maskPhone(this.pii.decrypt(phoneEncrypted) as PhoneNumber)
    } catch (error) {
      this.logger.error(`Could not decrypt customer phone for ledger entry ${entryId}`)
      throw error
    }
  }

  async findRedemption(shopId: string, rawCode: string, now: Date): Promise<Result<ActiveRedemptionPreview, RedemptionLookupError>> {
    const found = await this.redemptionLookup.findByCode(shopId, rawCode, now)
    if (!found.ok) return found

    const [user] = await this.db
      .select({ phoneEncrypted: appUsers.phoneEncrypted, erasedAt: appUsers.erasedAt })
      .from(appUsers)
      .where(eq(appUsers.id, found.value.customerId))
      .limit(1)
    // O `erase` expira os códigos ativos; se ainda assim chegar aqui, trata como código que não vale.
    if (!user || user.erasedAt !== null) return err({ code: 'redemptionInvalid' })

    return ok({
      redemptionId: found.value.redemptionId,
      rewardTitle: found.value.rewardTitle,
      maskedPhone: this.maskedPhone(found.value.redemptionId, user.phoneEncrypted),
      expiresAt: found.value.expiresAt,
    })
  }

  async settleRedemption(
    shop: ShopWithProgram,
    redemptionId: string,
    merchantUserId: string,
    now: Date,
  ): Promise<Result<CounterEntry, SettleRedemptionError>> {
    return await this.db.transaction(async (tx) => {
      const settled = await this.ledger.settleRedemption(tx, {
        redemptionId,
        shopId: shop.shopId,
        recordedBy: merchantUserId,
        now,
      })
      if (!settled.ok) return settled

      const [entry] = await tx
        .select({
          id: ledgerEntries.id,
          occurredAt: ledgerEntries.occurredAt,
          rewardTitle: redemptions.rewardTitle,
          phoneEncrypted: appUsers.phoneEncrypted,
          erasedAt: appUsers.erasedAt,
        })
        .from(ledgerEntries)
        .innerJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
        .innerJoin(appUsers, eq(appUsers.id, ledgerEntries.customerId))
        .where(and(eq(ledgerEntries.redemptionId, redemptionId), eq(ledgerEntries.kind, 'redemption')))
        .limit(1)

      if (!entry) {
        throw new Error(`Redemption ledger entry not found for redemption ${redemptionId}`)
      }

      const maskedPhone = this.maskedPhoneOf(entry.id, entry.phoneEncrypted, entry.erasedAt)

      return ok(
        CounterEntrySchema.parse({
          id: entry.id,
          shopId: shop.shopId,
          maskedPhone,
          kind: 'redemption',
          unit: shop.unit,
          units: 0,
          amountCents: null,
          rewardTitle: entry.rewardTitle,
          isNewCustomer: false,
          createdAt: toIso(entry.occurredAt ?? now),
        }),
      )
    })
  }
}

