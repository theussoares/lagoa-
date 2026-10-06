import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { planEarning } from '#shared/domain/earning'
import type { EarnInput } from '#shared/domain/programStrategies'
import type { Birthday } from '#shared/schemas/common'
import { LoyaltyCardIdSchema, ShopIdSchema, VisitIdSchema } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import { CounterEntrySchema, type CounterEntry, type VisitRegistered } from '#shared/schemas/visit'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { DB, type Database } from '../../database/database.module'
import { appUsers, customerProfiles, ledgerEntries, programs, redemptions, shops } from '../../database/schema'
import { type ExpiryContext, LedgerStore } from '../../ledger/ledger.store'
import { toExpirationPolicy, toProgramRules } from '../../programs/program-rules.mapper'
import { RedemptionLookup } from '../../ledger/redemption-lookup'
import { err, ok, type Result } from '#shared/types/result'
import type { ErrorOf } from '#shared/types/errors'
import {
  CounterRepository,
  type ActiveRedemptionPreview,
  type ResolvedCustomer,
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

  async resolveOrCreateCustomer(
    phone: string,
    phoneHash: Buffer,
    phoneEncrypted: Buffer,
    referralCode: string,
  ): Promise<ResolvedCustomer> {
    const [existing] = await this.db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.phoneHash, phoneHash))
      .limit(1)

    if (existing) {
      const [profile] = await this.db
        .select({ birthday: customerProfiles.birthday })
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, existing.id))
        .limit(1)

      return {
        customerId: existing.id,
        birthday: profile?.birthday ?? null,
        isNewCustomer: false,
        phone,
      }
    }

    const newUserId = uuidv7()
    await this.db.transaction(async (tx) => {
      await tx.insert(appUsers).values({
        id: newUserId,
        phoneEncrypted,
        phoneHash,
      })
      await tx.insert(customerProfiles).values({
        userId: newUserId,
        referralCode,
        notificationsConsent: false,
      })
    })

    return {
      customerId: newUserId,
      birthday: null,
      isNewCustomer: true,
      phone,
    }
  }

  async recordVisit(
    shop: ShopWithProgram,
    customer: ResolvedCustomer,
    input: EarnInput,
    merchantUserId: string,
    now: Date,
  ): Promise<{ visit: VisitRegistered; isFirstVisit: boolean }> {
    return this.db.transaction(async (tx) => {
      const policyResult = toExpirationPolicy({
        expirationKind: shop.expirationKind,
        expirationMonths: shop.expirationMonths,
      })
      if (!policyResult.ok) throw new Error('Invalid expiration policy')

      const rulesResult = toProgramRules({
        mode: shop.mode,
        earnUnits: shop.earnUnits,
        target: shop.target,
      })
      if (!rulesResult.ok) throw new Error('Invalid program rules')

      const expiry: ExpiryContext = {
        policy: policyResult.value,
        target: shop.target,
        now,
      }

      const { card } = await this.ledger.lockOrCreateCard(
        tx,
        {
          shopId: shop.shopId,
          customerId: customer.customerId,
          programId: shop.programId,
        },
        expiry,
      )

      const isFirstVisit = card.lastVisitAt === null

      const plan = planEarning({
        rules: rulesResult.value,
        bonusRules: shop.bonusRules,
        customerBirthday: customer.birthday as Birthday | null,
        card,
        input,
        now,
      })

      if (!plan.ok) {
        throw new Error(`planEarning failed: ${plan.error.code}`)
      }

      const { entryId } = await this.ledger.credit(tx, {
        card,
        shopId: shop.shopId,
        customerId: customer.customerId,
        plan: plan.value,
        kind: input.kind === 'amount' ? 'amount' : 'visit',
        now,
        idempotencyKey: `counter:${shop.shopId}:${card.id}:${now.getTime()}`,
        recordedBy: merchantUserId,
        amountCents: input.kind === 'amount' ? input.amountCents : null,
      })

      const visit: VisitRegistered = {
        entry: {
          id: VisitIdSchema.parse(entryId),
          shopId: ShopIdSchema.parse(shop.shopId),
          maskedPhone: maskPhone(customer.phone as PhoneNumber),
          kind: input.kind === 'amount' ? 'amount' : 'visit',
          unit: shop.unit,
          units: plan.value.units,
          amountCents: input.kind === 'amount' ? input.amountCents : null,
          rewardTitle: null,
          isNewCustomer: isFirstVisit,
          createdAt: toIso(now),
        },
        card: {
          cardId: LoyaltyCardIdSchema.parse(card.id),
          unit: shop.unit,
          balance: plan.value.balanceAfter,
          target: shop.target,
          rewardReady: plan.value.balanceAfter >= shop.target,
        },
        unitsEarned: plan.value.units,
        welcomeUnits: plan.value.welcomeUnits,
      }

      return { visit, isFirstVisit }
    })
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

