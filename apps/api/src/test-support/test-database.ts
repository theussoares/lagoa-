import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import { and, eq, inArray, sql, type SQLWrapper } from 'drizzle-orm'
import postgres from 'postgres'
import { REFERRAL_CODE_LENGTH, VISIT_CODE_LENGTH } from '#shared/constants/domain'
import { visitQrExpiresAt } from '#shared/domain/visitQr'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { Birthday } from '#shared/schemas/common'
import type { BonusRules, ExpirationPolicy, ProgramRules } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import type { VisitQrCancelReason, VisitQrEarn, VisitQrStatus } from '#shared/schemas/visitQr'
import { generateReadableCode } from '../common/readable-code'
import { generateVisitToken, hashVisitToken } from '../common/visit-token'
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

/** Um nó de varredura do plano de uma consulta: o tipo (`Index Scan`, `Seq Scan`...), a tabela e o índice usado. */
export interface PlanScan {
  readonly node: string
  readonly relation: string | null
  readonly index: string | null
}

function collectScans(plan: unknown, found: PlanScan[] = []): PlanScan[] {
  if (Array.isArray(plan)) {
    for (const item of plan) collectScans(item, found)
    return found
  }
  if (typeof plan !== 'object' || plan === null) return found
  const fields = new Map(Object.entries(plan))
  const node = fields.get('Node Type')
  const relation = fields.get('Relation Name')
  const index = fields.get('Index Name')
  if (typeof node === 'string') {
    found.push({ node, relation: typeof relation === 'string' ? relation : null, index: typeof index === 'string' ? index : null })
  }
  for (const value of fields.values()) collectScans(value, found)
  return found
}

export interface TestVisitQr {
  readonly id: string
  /** O token em claro, como estaria no QR (o banco só guarda o hash). */
  readonly token: string
  readonly visitCode: string
}

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

  /**
   * Emite um QR da visita direto no banco (o `merchant/visit-qrs` ainda não existe). Padrões: programa ativo da loja,
   * emissor = dono da loja, "uma visita", criado agora. `claimed` fica de fora: só o uso real do QR liga o ledger.
   */
  async createVisitQr(options: {
    shopId: string
    programId?: string
    issuedBy?: string
    earn?: VisitQrEarn
    createdAt?: Date
    status?: Exclude<VisitQrStatus, 'claimed'>
    cancelReason?: VisitQrCancelReason
  }): Promise<TestVisitQr> {
    const [shop] = await this.db.select({ ownerUserId: schema.shops.ownerUserId }).from(schema.shops).where(eq(schema.shops.id, options.shopId))
    if (!shop) throw new Error('shop expected')
    const programId = options.programId ?? (await this.activeProgramId(options.shopId))
    const earn = options.earn ?? { kind: 'visit' }
    const createdAt = options.createdAt ?? new Date()
    const status = options.status ?? 'active'
    const token = generateVisitToken()
    const visitCode = await this.freeVisitCode()
    const [row] = await this.db
      .insert(schema.visitQrs)
      .values({
        shopId: options.shopId,
        programId,
        issuedBy: options.issuedBy ?? shop.ownerUserId,
        tokenHash: hashVisitToken(token),
        visitCode,
        earnKind: earn.kind,
        amountCents: earn.kind === 'amount' ? earn.amountCents : null,
        status,
        cancelReason: status === 'cancelled' ? (options.cancelReason ?? 'merchant') : null,
        createdAt,
        expiresAt: visitQrExpiresAt(createdAt),
      })
      .returning({ id: schema.visitQrs.id })
    if (!row) throw new Error('visit QR insert returned no row')
    return { id: row.id, token, visitCode }
  }

  private async activeProgramId(shopId: string): Promise<string> {
    const [program] = await this.db
      .select({ id: schema.programs.id })
      .from(schema.programs)
      .where(and(eq(schema.programs.shopId, shopId), eq(schema.programs.active, true)))
    if (!program) throw new Error('active program expected')
    return program.id
  }

  /** O índice único parcial só vale entre ativos; escolher um código livre evita flake no raro sorteio repetido. */
  private async freeVisitCode(): Promise<string> {
    for (;;) {
      const code = generateReadableCode(VISIT_CODE_LENGTH)
      const [taken] = await this.db.select({ id: schema.visitQrs.id }).from(schema.visitQrs).where(eq(schema.visitQrs.visitCode, code)).limit(1)
      if (!taken) return code
    }
  }

  /**
   * Os nós de varredura do plano da consulta com `seq scan` desligado. A tabela de teste é pequena demais para o
   * planner preferir o índice sozinho; desligando a varredura sequencial, sobra a prova de que existe índice que atende.
   */
  async scansWithoutSeqScan(query: SQLWrapper): Promise<PlanScan[]> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`set local enable_seqscan = off`)
      const [row] = await tx.execute(sql`explain (format json) ${query.getSQL()}`)
      const plan: unknown = row?.['QUERY PLAN']
      return collectScans(typeof plan === 'string' ? JSON.parse(plan) : plan)
    })
  }

  /** Para a loja criada pelo próprio serviço sob teste (não por `createShop`): entra na limpeza do fim. */
  trackShop(shopId: string): void {
    this.shopIds.push(shopId)
  }

  async cleanup(): Promise<void> {
    if (this.shopIds.length > 0) {
      // Antes do ledger: o QR usado aponta para a linha de ganho.
      await this.db.delete(schema.visitQrs).where(inArray(schema.visitQrs.shopId, this.shopIds))
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
      await this.db.delete(schema.shopStatusEvents).where(inArray(schema.shopStatusEvents.shopId, this.shopIds))
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
