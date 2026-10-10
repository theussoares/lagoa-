import { PhoneNumberSchema } from '#shared/schemas/phone'
import { and, count, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Clock } from '../common/clock'
import { PiiService } from '../common/pii.service'
import { CheckInService } from '../customer/check-in/check-in.service'
import { DrizzleCheckInRepository } from '../customer/check-in/drizzle-check-in.repository'
import { DrizzleRedemptionRepository } from '../customer/redemption/drizzle-redemption.repository'
import { RedemptionService } from '../customer/redemption/redemption.service'
import { DrizzleReferralRepository } from '../customer/referral/drizzle-referral.repository'
import { ReferralService } from '../customer/referral/referral.service'
import { loyaltyCards, programs, referrals, visitQrs } from '../database/schema'
import { DrizzleReferralSettlement } from '../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../ledger/ledger.store'
import { RedemptionLookup } from '../ledger/redemption-lookup'
import { createTestPii } from '../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { DrizzleProgramRepository } from './program/drizzle-program.repository'
import { ProgramService } from './program/program.service'
import { ClubSetupService } from './club-setup/club-setup.service'
import { DrizzleClubSetupRepository } from './club-setup/drizzle-club-setup.repository'
import { CounterRedemptionsService } from './counter/counter-redemptions.service'
import { DrizzleCounterRepository } from './counter/drizzle-counter.repository'
import { CustomersService } from './customers/customers.service'
import { DrizzleCustomersRepository } from './customers/drizzle-customers.repository'
import { DrizzleHomeRepository } from './home/drizzle-home.repository'
import { HomeService } from './home/home.service'
import { DrizzleSessionRepository } from './session/drizzle-session.repository'
import { DrizzleVisitQrsRepository } from './visit-qrs/drizzle-visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs/visit-qrs.rules'
import { VisitQrsService } from './visit-qrs/visit-qrs.service'

const SLOW = 30_000

class TestClock extends Clock {
  constructor(private currentTime: Date) {
    super()
  }

  now(): Date {
    return this.currentTime
  }

  setTime(time: Date): void {
    this.currentTime = time
  }
}

describe.skipIf(!TEST_DATABASE_URL)('merchant end-to-end integration against real database (Task 7)', () => {
  let data: TestDatabase
  let clock: TestClock
  let pii: PiiService
  let ledger: LedgerStore
  let settlement: DrizzleReferralSettlement
  let redemptionLookup: RedemptionLookup

  // Merchant services
  let clubSetupService: ClubSetupService
  let programService: ProgramService
  let visitQrsService: VisitQrsService
  let counterRedemptionsService: CounterRedemptionsService
  let customersService: CustomersService
  let homeService: HomeService

  // Customer services
  let checkInService: CheckInService
  let referralService: ReferralService
  let redemptionService: RedemptionService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    clock = new TestClock(new Date('2026-10-08T12:00:00Z'))
    pii = createTestPii()
    ledger = new LedgerStore()
    settlement = new DrizzleReferralSettlement(data.db, ledger)
    redemptionLookup = new RedemptionLookup(data.db)

    const sessionRepo = new DrizzleSessionRepository(data.db)
    const clubSetupRepo = new DrizzleClubSetupRepository(data.db)
    const visitQrsRepo = new DrizzleVisitQrsRepository(data.db, pii)
    const counterRepo = new DrizzleCounterRepository(data.db, ledger, pii, redemptionLookup)
    const customersRepo = new DrizzleCustomersRepository(data.db)
    const homeRepo = new DrizzleHomeRepository(data.db)

    clubSetupService = new ClubSetupService(clubSetupRepo, pii, clock)
    programService = new ProgramService(new DrizzleProgramRepository(data.db))
    visitQrsService = new VisitQrsService(visitQrsRepo, sessionRepo, new VisitQrsRules(), clock)
    counterRedemptionsService = new CounterRedemptionsService(counterRepo, clock)
    customersService = new CustomersService(sessionRepo, customersRepo, pii, clock)
    homeService = new HomeService(sessionRepo, homeRepo, clock)

    const checkInRepo = new DrizzleCheckInRepository(data.db, ledger)
    const referralRepo = new DrizzleReferralRepository(data.db)
    const redemptionRepo = new DrizzleRedemptionRepository(data.db, ledger)

    checkInService = new CheckInService(checkInRepo, clock, settlement)
    referralService = new ReferralService(referralRepo)
    redemptionService = new RedemptionService(redemptionRepo, clock)
  })

  afterAll(async () => {
    await data.close()
  })

  it('runs complete lifecycle: club creation, approval, dynamic QR issue, check-in referral settlement, redemption and metrics', async () => {
    // 1. Criação do lojista e da loja (club-setup)
    const merchantUserId = await data.createCustomer({ withProfile: false })
    const setupDraft = {
      shop: {
        name: 'Padaria Modelo',
        category: 'cafe' as const,
        neighborhood: 'Centro',
        addressLine: 'Rua das Flores, 123',
      },
      program: {
        reward: { title: 'Café e Pão na Chapa' },
        rules: { mode: 'stamps' as const, target: 3 },
        bonusRules: {
          welcomeBonus: { enabled: true, units: 1 },
          birthdayMultiplier: { enabled: false, multiplier: 2 as const },
          referralBonus: { enabled: true, units: 2 },
          surpriseDay: { enabled: false, multiplier: 2 as const, date: null },
        },
        expirationPolicy: { kind: 'never' as const },
        checkIn: { enabled: true, cooldownHours: 1 },
      },
    }

    const clubResult = await clubSetupService.createClub({ id: merchantUserId, email: undefined, phone: PhoneNumberSchema.parse('67900000099') }, setupDraft)
    expect(clubResult.ok).toBe(true)
    if (!clubResult.ok) throw new Error('Failed to create club')
    const shopId = clubResult.value.session.shopId
    data.trackShop(shopId)
    expect(clubResult.value.session.shopStatus).toBe('pending')

    // 2. Aprovação da loja via test-approve
    vi.stubEnv('ENABLE_TEST_APPROVE', '1')
    const approvalResult = await clubSetupService.testApprove(merchantUserId)
    vi.unstubAllEnvs()
    expect(approvalResult.ok).toBe(true)
    if (!approvalResult.ok) throw new Error('Failed to approve shop')
    expect(approvalResult.value).toBe('approved')

    // 3. Lojista emite um VisitQr dinâmico no Balcão
    const issuedResult = await visitQrsService.issueVisitQr(merchantUserId, {})
    expect(issuedResult.ok).toBe(true)
    if (!issuedResult.ok) throw new Error('Failed to issue visit QR')
    const issuedQr = issuedResult.value
    expect(issuedQr.status).toBe('active')
    expect(issuedQr.token).toHaveLength(43)

    // 4. Clientes: Indicador e Indicado. Indicado captura convite e escaneia QR
    const referrerId = await data.createCustomer()
    const referredId = await data.createCustomer()
    await data.setPhone(referrerId, pii.encrypt('67988776655'))
    await data.setPhone(referredId, pii.encrypt('67999887766'))

    const referrerCode = await data.referralCodeOf(referrerId)
    const posterResult = await clubSetupService.getPoster(merchantUserId)
    expect(posterResult.ok).toBe(true)
    if (!posterResult.ok) throw new Error('Failed to get poster')

    // Captura convite de indicação
    const inviteResult = await referralService.capture(referredId, referrerCode, posterResult.value.checkInCode)
    expect(inviteResult.ok).toBe(true)

    // Cliente indicado escaneia o token do QR
    const claim1 = await checkInService.claimVisitQr(referredId, { token: issuedQr.token })
    expect(claim1.ok).toBe(true)

    // 5. Verificação: claim ocorreu, referral liquidado, QR mudou para 'claimed'
    const [referralRow] = await data.db
      .select()
      .from(referrals)
      .where(and(eq(referrals.shopId, shopId), eq(referrals.referredId, referredId)))
    expect(referralRow).toBeDefined()
    expect(referralRow?.status).toBe('rewarded')
    expect(referralRow?.rewardEntryId).not.toBeNull()

    // Bônus de indicação foi creditado no cartão do indicador
    const [referrerCard] = await data.db
      .select()
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, shopId), eq(loyaltyCards.customerId, referrerId)))
    expect(referrerCard?.balance).toBe(2)

    // O VisitQr no banco está com status 'claimed'
    const [qrInDb] = await data.db.select().from(visitQrs).where(eq(visitQrs.id, issuedQr.id))
    expect(qrInDb?.status).toBe('claimed')
    expect(qrInDb?.ledgerEntryId).not.toBeNull()

    // 6. Lojista consulta GET /v1/merchant/visit-qrs/:id e vê o claim com telefone mascarado (LGPD)
    const fetchedQr = await visitQrsService.getVisitQr(merchantUserId, issuedQr.id)
    expect(fetchedQr.ok).toBe(true)
    if (!fetchedQr.ok) throw new Error('Failed to get visit QR')
    expect(fetchedQr.value.status).toBe('claimed')
    expect(fetchedQr.value.claim).not.toBeNull()
    expect(fetchedQr.value.claim?.entry.maskedPhone).toBe('(67) 9••••-7766')
    expect(fetchedQr.value.claim?.entry.isNewCustomer).toBe(true)
    expect(fetchedQr.value.claim?.welcomeUnits).toBe(1)
    expect(fetchedQr.value.claim?.unitsEarned).toBe(1)
    expect(JSON.stringify(fetchedQr.value)).not.toContain('67999887766')

    // 7. Cliente acumula pontos até a meta e gera resgate; lojista valida e entrega no balcão
    // Avança o relógio para além do cooldown (1 hora)
    clock.setTime(new Date(clock.now().getTime() + 2 * 3600_000))

    // 2ª visita via novo VisitQr dinâmico
    const secondIssued = await visitQrsService.issueVisitQr(merchantUserId, {})
    expect(secondIssued.ok).toBe(true)
    if (!secondIssued.ok) throw new Error('Failed to issue 2nd visit QR')

    const claim2 = await checkInService.claimVisitQr(referredId, { token: secondIssued.value.token })
    expect(claim2.ok).toBe(true)

    // Cartão do indicado: 1 de boas-vindas + 2 visitas = 3 carimbos (meta atingida)
    const [referredCard] = await data.db
      .select()
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, shopId), eq(loyaltyCards.customerId, referredId)))
    expect(referredCard?.balance).toBe(3)

    // Cliente gera código de resgate
    const redemptionResult = await redemptionService.requestCode(referredId, referredCard!.id)
    expect(redemptionResult.ok).toBe(true)
    if (!redemptionResult.ok) throw new Error('Failed to request redemption')
    const redemptionCode = redemptionResult.value.code

    // Lojista valida o código no balcão
    const previewResult = await counterRedemptionsService.validateRedemption(merchantUserId, redemptionCode)
    expect(previewResult.ok).toBe(true)
    if (!previewResult.ok) throw new Error('Failed to validate redemption')
    expect(previewResult.value.rewardTitle).toBe('Café e Pão na Chapa')
    expect(previewResult.value.maskedPhone).toBe('(67) 9••••-7766')

    // Lojista confirma a entrega do prêmio
    const confirmResult = await counterRedemptionsService.confirmRedemption(merchantUserId, previewResult.value.redemptionId)
    expect(confirmResult.ok).toBe(true)
    if (!confirmResult.ok) throw new Error('Failed to confirm redemption')
    expect(confirmResult.value.kind).toBe('redemption')
    expect(confirmResult.value.rewardTitle).toBe('Café e Pão na Chapa')

    // O resgate zera o cartão e o próximo já começa andado pelas boas-vindas (1 carimbo)
    const [cardAfterRedemption] = await data.db
      .select()
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.shopId, shopId), eq(loyaltyCards.customerId, referredId)))
    expect(cardAfterRedemption?.balance).toBe(1)

    // 8. Verificação do diretório de clientes e resumo semanal
    const customersResult = await customersService.listCustomers(merchantUserId, 'all')
    expect(customersResult.ok).toBe(true)
    if (!customersResult.ok) throw new Error('Failed to list customers')
    expect(customersResult.value.length).toBeGreaterThanOrEqual(1)
    for (const cust of customersResult.value) {
      expect(cust.maskedPhone).toMatch(/^\(\d{2}\)\s\d••••-\d{4}$/)
      expect(JSON.stringify(cust)).not.toContain('67999887766')
    }

    const homeResult = await homeService.getWeekSummary(merchantUserId)
    expect(homeResult.ok).toBe(true)
    if (!homeResult.ok) throw new Error('Failed to get week summary')
    expect(homeResult.value.days).toHaveLength(7)
    expect(homeResult.value.visits).toBe(2)
    expect(homeResult.value.redemptions).toBe(1)
    expect(homeResult.value.customers).toBe(1)

    // 9. Troca de programa: nova versão cancela o QR aberto; trocar a modalidade com cartões é recusado
    const openQr = await visitQrsService.issueVisitQr(merchantUserId, {})
    if (!openQr.ok) throw new Error('Failed to issue QR before program change')

    const current = await programService.getProgram(merchantUserId)
    if (!current.ok) throw new Error('Failed to read program')
    const { id: _id, shopId: _shopId, ...draft } = current.value
    const newTarget = await programService.updateProgram(merchantUserId, { ...draft, rules: { mode: 'stamps', target: 4 } })
    expect(newTarget.ok).toBe(true)
    if (!newTarget.ok) throw new Error('Failed to change target')
    expect(newTarget.value.id).not.toBe(current.value.id)

    const [cancelledQr] = await data.db.select().from(visitQrs).where(eq(visitQrs.id, openQr.value.id))
    expect(cancelledQr?.status).toBe('cancelled')
    expect(cancelledQr?.cancelReason).toBe('programChanged')

    const modeChange = await programService.updateProgram(merchantUserId, {
      ...draft,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    })
    expect(modeChange).toEqual({ ok: false, error: { code: 'programModeLocked' } })
    const [activePrograms] = await data.db.select({ n: count() }).from(programs).where(and(eq(programs.shopId, shopId), eq(programs.active, true)))
    expect(activePrograms?.n).toBe(1)
  }, SLOW)
})
