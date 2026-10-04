import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, inArray } from 'drizzle-orm'
import postgres from 'postgres'
import { REFERRAL_CODE_LENGTH } from '#shared/constants/domain'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { Birthday } from '#shared/schemas/common'
import type { BonusRules, ExpirationPolicy, ProgramRules } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import { generateReadableCode } from '../common/readable-code'
import type { Database } from '../database/database.module'
import type { ExpiryContext } from '../ledger/ledger.store'
import * as schema from '../database/schema'

/** Postgres de verdade, só quando `TEST_DATABASE_URL` existe (CI sobe um container; local, um banco de dev). */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

export const NO_BONUS_RULES: BonusRules = {
  welcomeBonus: { enabled: false, units: 1 },
  birthdayMultiplier: { enabled: false, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}

/** Contexto de vencimento para quem só quer travar um cartão sem se preocupar com prazo. */
export const neverExpires = (target = 10): ExpiryContext => ({ policy: { kind: 'never' }, target, now: new Date() })

export interface TestShop {
  readonly id: string
  readonly programId: string
  readonly checkInCode: string
}

/** Cria o que cada teste precisa e remove tudo no fim, sem depender de seed nem de outros testes. */
export class TestDatabase {
  readonly db: Database
  private readonly client: postgres.Sql
  private readonly userIds: string[] = []
  private readonly shopIds: string[] = []

  constructor(url: string) {
    this.client = postgres(url, { prepare: false, max: 10 })
    this.db = drizzle(this.client, { schema })
  }

  async createCustomer(options: { birthday?: Birthday | null; withProfile?: boolean } = {}): Promise<string> {
    const id = randomUUID()
    const bytes = Buffer.from(`t-${id}`)
    await this.db.insert(schema.appUsers).values({
      id,
      emailEncrypted: bytes,
      emailHash: Buffer.from(`email-${id}`),
      phoneEncrypted: bytes,
      phoneHash: Buffer.from(`phone-${id}`),
    })
    this.userIds.push(id)
    if (options.withProfile !== false) {
      await this.db.insert(schema.customerProfiles).values({ userId: id, referralCode: generateReadableCode(REFERRAL_CODE_LENGTH), birthday: options.birthday ?? null })
    }
    return id
  }

  /** Troca o celular cifrado do cliente (para testar o que depende de um número conhecido). */
  async setPhone(customerId: string, phoneEncrypted: Buffer): Promise<void> {
    await this.db.update(schema.appUsers).set({ phoneEncrypted }).where(eq(schema.appUsers.id, customerId))
  }

  async referralCodeOf(customerId: string): Promise<string> {
    const [row] = await this.db.select({ code: schema.customerProfiles.referralCode }).from(schema.customerProfiles).where(eq(schema.customerProfiles.userId, customerId))
    if (!row) throw new Error('profile expected')
    return row.code
  }

  async createShop(options: {
    status?: ShopStatus
    rules?: ProgramRules
    bonusRules?: BonusRules
    checkInEnabled?: boolean
    cooldownHours?: number
    expiration?: ExpirationPolicy
  } = {}): Promise<TestShop> {
    const ownerId = await this.createCustomer({ withProfile: false })
    const rules = options.rules ?? { mode: 'stamps', target: 10 }
    const shop = { id: randomUUID(), programId: randomUUID(), checkInCode: generateReadableCode(6) }
    await this.db.insert(schema.shops).values({
      id: shop.id,
      ownerUserId: ownerId,
      name: 'Loja de teste',
      category: 'cafe',
      neighborhood: 'Centro',
      addressLine: 'Rua de teste, 1',
      checkInCode: shop.checkInCode,
      status: options.status ?? 'approved',
    })
    this.shopIds.push(shop.id)
    await this.db.insert(schema.programs).values({
      id: shop.programId,
      shopId: shop.id,
      rewardTitle: 'Prêmio de teste',
      mode: rules.mode,
      unit: unitOf(rules),
      earnPer: earnRateOf(rules).per,
      earnUnits: rules.mode === 'stamps' ? 1 : earnRateOf(rules).units,
      target: rules.target,
      bonusRules: options.bonusRules ?? NO_BONUS_RULES,
      expirationKind: options.expiration?.kind ?? 'never',
      expirationMonths: options.expiration?.kind === 'afterInactivity' ? options.expiration.months : null,
      checkInEnabled: options.checkInEnabled ?? true,
      checkInCooldownHours: options.cooldownHours ?? 24,
    })
    return shop
  }

  /** Troca o programa da loja como o painel fará: desativa a versão atual e cria outra ativa. Devolve o id da nova. */
  async changeProgram(shop: TestShop, rules: ProgramRules, options: { rewardTitle?: string; bonusRules?: BonusRules } = {}): Promise<string> {
    const programId = randomUUID()
    await this.db.transaction(async (tx) => {
      await tx.update(schema.programs).set({ active: false }).where(eq(schema.programs.shopId, shop.id))
      await tx.insert(schema.programs).values({
        id: programId,
        shopId: shop.id,
        rewardTitle: options.rewardTitle ?? 'Prêmio novo',
        mode: rules.mode,
        unit: unitOf(rules),
        earnPer: earnRateOf(rules).per,
        earnUnits: rules.mode === 'stamps' ? 1 : earnRateOf(rules).units,
        target: rules.target,
        bonusRules: options.bonusRules ?? NO_BONUS_RULES,
        checkInCooldownHours: 24,
      })
    })
    return programId
  }

  async cleanup(): Promise<void> {
    if (this.shopIds.length > 0) {
      await this.db.update(schema.referrals).set({ rewardEntryId: null }).where(inArray(schema.referrals.shopId, this.shopIds))
    }
    if (this.userIds.length > 0) {
      await this.db.delete(schema.ledgerEntries).where(inArray(schema.ledgerEntries.customerId, this.userIds))
      await this.db.delete(schema.redemptions).where(inArray(schema.redemptions.shopId, this.shopIds))
      await this.db.delete(schema.loyaltyCards).where(inArray(schema.loyaltyCards.customerId, this.userIds))
    }
    if (this.shopIds.length > 0) {
      await this.db.delete(schema.referrals).where(inArray(schema.referrals.shopId, this.shopIds))
      await this.db.delete(schema.programs).where(inArray(schema.programs.shopId, this.shopIds))
      await this.db.delete(schema.shops).where(inArray(schema.shops.id, this.shopIds))
    }
    if (this.userIds.length > 0) {
      await this.db.delete(schema.customerProfiles).where(inArray(schema.customerProfiles.userId, this.userIds))
      await this.db.delete(schema.appUsers).where(inArray(schema.appUsers.id, this.userIds))
    }
  }

  async close(): Promise<void> {
    await this.cleanup()
    await this.client.end()
  }
}
