import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { ShopIdSchema } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import { CounterEntrySchema, type CounterEntry } from '#shared/schemas/visit'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { DB, type Database } from '../../database/database.module'
import { appUsers, ledgerEntries, programs, redemptions, shops } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { RedemptionLookup } from '../../ledger/redemption-lookup'
import { err, ok, type Result } from '#shared/types/result'
import type { ErrorOf } from '#shared/types/errors'
import {
  CounterRepository,
  type ActiveRedemptionPreview,
  type SettleRedemptionError,
  type ShopWithProgram,
} from './counter.repository'

@Injectable()
export class DrizzleCounterRepository extends CounterRepository {
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

  async listTodayEntries(shopId: string, startOfDay: Date): Promise<CounterEntry[]> {
    const rows = await this.db
      .select({
        id: ledgerEntries.id,
        shopId: ledgerEntries.shopId,
        kind: ledgerEntries.kind,
        unitsDelta: ledgerEntries.unitsDelta,
        amountCents: ledgerEntries.amountCents,
        occurredAt: ledgerEntries.occurredAt,
        phoneEncrypted: appUsers.phoneEncrypted,
        rewardTitle: redemptions.rewardTitle,
        programUnit: programs.unit,
      })
      .from(ledgerEntries)
      .innerJoin(appUsers, eq(appUsers.id, ledgerEntries.customerId))
      .leftJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
      .innerJoin(programs, and(eq(programs.shopId, ledgerEntries.shopId), eq(programs.active, true)))
      .where(
        and(
          eq(ledgerEntries.shopId, shopId),
          gte(ledgerEntries.occurredAt, startOfDay),
          inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn', 'redemption']),
        ),
      )
      .orderBy(desc(ledgerEntries.occurredAt), desc(ledgerEntries.id))

    return rows.map((row) => {
      const decryptedPhone = this.pii.decrypt(row.phoneEncrypted)
      return CounterEntrySchema.parse({
        id: row.id,
        shopId: row.shopId,
        maskedPhone: maskPhone(decryptedPhone as PhoneNumber),
        kind: row.kind,
        unit: row.programUnit,
        units: row.unitsDelta > 0 ? row.unitsDelta : 0,
        amountCents: row.amountCents,
        rewardTitle: row.rewardTitle,
        isNewCustomer: false,
        createdAt: toIso(row.occurredAt ?? new Date()),
      })
    })
  }

  async findActiveRedemption(
    shopId: string,
    rawCode: string,
    now: Date,
  ): Promise<Result<ActiveRedemptionPreview, ErrorOf<'redemptionInvalid' | 'redemptionExpired'>>> {
    const active = await this.redemptionLookup.findActive(shopId, rawCode, now)
    if (!active.ok) return active

    const [user] = await this.db
      .select({ phoneEncrypted: appUsers.phoneEncrypted })
      .from(appUsers)
      .where(eq(appUsers.id, active.value.customerId))
      .limit(1)

    if (!user) return err({ code: 'redemptionInvalid' })

    const phone = this.pii.decrypt(user.phoneEncrypted)
    const maskedPhone = maskPhone(phone as PhoneNumber)

    return ok({
      redemptionId: active.value.redemptionId,
      rewardTitle: active.value.rewardTitle,
      maskedPhone,
      expiresAt: active.value.expiresAt,
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
        })
        .from(ledgerEntries)
        .innerJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
        .innerJoin(appUsers, eq(appUsers.id, ledgerEntries.customerId))
        .where(and(eq(ledgerEntries.redemptionId, redemptionId), eq(ledgerEntries.kind, 'redemption')))
        .limit(1)

      if (!entry) {
        throw new Error(`Redemption ledger entry not found for redemption ${redemptionId}`)
      }

      const phone = this.pii.decrypt(entry.phoneEncrypted)
      const maskedPhone = maskPhone(phone as PhoneNumber)

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

