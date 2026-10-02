/**
 * DADOS DE EXEMPLO. Lojas, pessoas e números são fictícios e não representam o
 * piloto; telefones usam a faixa de teste 67 90000-00xx. Trocar por dados
 * reais só via backend de verdade.
 */
import { addDays, addHours, toIso } from '#shared/utils/time'
import {
  ChallengeIdSchema,
  CustomerIdSchema,
  LoyaltyCardIdSchema,
  MerchantIdSchema,
  ProgramIdSchema,
  ShopIdSchema,
  VisitIdSchema,
} from '#shared/schemas/ids'
import type { CustomerId, ShopId } from '#shared/schemas/ids'
import type { EarnSource, LoyaltyCard } from '#shared/schemas/loyaltyCard'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { BonusRules, Program, ProgramRules } from '#shared/schemas/program'
import { LoginCodeSchema } from '#shared/schemas/session'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import type { CheckInCode } from '#shared/schemas/shop'
import { unitOf } from '#shared/domain/programStrategies'
import { MOCK_STATE_VERSION } from './state'
import type { CustomerRecord, LedgerRecord, MockState, ShopRecord } from './state'

export const MOCK_LOGIN_CODE = LoginCodeSchema.parse('246810')

export const EXAMPLE_IDS = {
  shops: {
    barbershop: ShopIdSchema.parse('shop_barbearia'),
    cafe: ShopIdSchema.parse('shop_cafe'),
    pizzeria: ShopIdSchema.parse('shop_pizzaria'),
    petShop: ShopIdSchema.parse('shop_pet'),
    gym: ShopIdSchema.parse('shop_academia'),
    bakery: ShopIdSchema.parse('shop_padaria'),
    beauty: ShopIdSchema.parse('shop_salao'),
  },
  customers: {
    ana: CustomerIdSchema.parse('cus_ana'),
    joao: CustomerIdSchema.parse('cus_joao'),
    maria: CustomerIdSchema.parse('cus_maria'),
    pedro: CustomerIdSchema.parse('cus_pedro'),
  },
  merchants: {
    barbershop: MerchantIdSchema.parse('mer_barbearia'),
    cafe: MerchantIdSchema.parse('mer_cafe'),
  },
  phones: {
    ana: PhoneNumberSchema.parse('67900000001'),
    joao: PhoneNumberSchema.parse('67900000002'),
    maria: PhoneNumberSchema.parse('67900000003'),
    pedro: PhoneNumberSchema.parse('67900000004'),
    barbershopMerchant: PhoneNumberSchema.parse('67900000010'),
    cafeMerchant: PhoneNumberSchema.parse('67900000011'),
  },
  checkInCodes: {
    barbershop: CheckInCodeSchema.parse('NAV4K7'),
    cafe: CheckInCodeSchema.parse('CAF8R3'),
    pizzeria: CheckInCodeSchema.parse('FRN5Z2'),
    petShop: CheckInCodeSchema.parse('PET6M9'),
    gym: CheckInCodeSchema.parse('MVT3H8'),
    bakery: CheckInCodeSchema.parse('PDR7Q4'),
    beauty: CheckInCodeSchema.parse('BEL2W6'),
  },
} as const

const S = EXAMPLE_IDS.shops
const C = EXAMPLE_IDS.customers
const P = EXAMPLE_IDS.phones

const defaultBonus: BonusRules = {
  welcomeBonus: { enabled: true, units: 2 },
  birthdayMultiplier: { enabled: true, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}

function shop(id: ShopId, name: string, category: ShopRecord['category'], neighborhood: string, checkInCode: CheckInCode, status: ShopRecord['status'] = 'approved'): ShopRecord {
  return { id, name, category, neighborhood, addressLine: `Endereço de exemplo, ${neighborhood}`, status, checkInCode }
}

function program(shopId: ShopId, rewardTitle: string, rules: ProgramRules, cooldownHours: number, bonusRules: BonusRules = defaultBonus): Program {
  return {
    id: ProgramIdSchema.parse(`prog_${shopId}`),
    shopId,
    reward: { title: rewardTitle },
    rules,
    bonusRules,
    expirationPolicy: { kind: 'afterInactivity', months: 6 },
    checkIn: { enabled: true, cooldownHours },
  }
}

function customer(id: CustomerId, phone: CustomerRecord['phone'], firstName: string | null, consent: boolean, createdAt: Date): CustomerRecord {
  return {
    id,
    phone,
    firstName,
    birthday: null,
    consent: { notifications: consent, updatedAt: consent ? toIso(createdAt) : null },
    termsAcceptedAt: toIso(createdAt),
    createdAt: toIso(createdAt),
  }
}

interface CardHistory {
  readonly customerId: CustomerId
  readonly program: Program
  /** Visitas em horas atrás, da mais antiga para a mais recente. */
  readonly visitsHoursAgo: readonly number[]
  readonly source?: EarnSource
  readonly amountCents?: number
}

/** Monta cartão e caderneta coerentes entre si a partir das visitas. */
function buildHistory(now: Date, history: CardHistory, ledgerIds: { next(): string }): { card: LoyaltyCard; ledger: LedgerRecord[] } {
  const { program: prog, customerId } = history
  const unit = unitOf(prog.rules)
  const perVisit = prog.rules.mode === 'pointsPerVisit' ? prog.rules.pointsPerVisit : 1
  const welcome = prog.bonusRules.welcomeBonus.enabled ? prog.bonusRules.welcomeBonus.units : 0
  const dates = history.visitsHoursAgo.map((hours) => addHours(now, -hours))
  const first = dates[0] ?? now
  const ledger: LedgerRecord[] = []
  const stamps: LoyaltyCard['stamps'] = []
  let balance = 0

  const earn = (units: number, source: EarnSource, at: Date): void => {
    if (unit === 'stamp') {
      for (let index = 0; index < units; index += 1) {
        stamps.push({ number: balance + index + 1, earnedAt: toIso(at), source })
      }
    }
    balance += units
  }

  earn(welcome, 'welcomeBonus', first)
  dates.forEach((at, index) => {
    const amountCents = history.amountCents ?? 0
    const isAmount = prog.rules.mode === 'pointsPerCurrency'
    const units = prog.rules.mode === 'pointsPerCurrency' ? Math.floor((amountCents / 100) * prog.rules.pointsPerReal) : perVisit
    const source = history.source ?? (isAmount ? 'counterAmount' : 'counter')
    earn(units, source, at)
    ledger.push({
      id: VisitIdSchema.parse(ledgerIds.next()),
      shopId: prog.shopId,
      customerId,
      kind: source === 'checkIn' ? 'checkIn' : isAmount ? 'amount' : 'visit',
      unit,
      units,
      amountCents: isAmount ? amountCents : null,
      rewardTitle: null,
      isNewCustomer: index === 0,
      createdAt: toIso(at),
    })
  })

  const lastVisit = dates.at(-1)
  const ready = balance >= prog.rules.target
  return {
    card: {
      id: LoyaltyCardIdSchema.parse(`card_${customerId}_${prog.shopId}`),
      shopId: prog.shopId,
      customerId,
      programId: prog.id,
      unit,
      balance,
      target: prog.rules.target,
      rewardTitle: prog.reward.title,
      stamps,
      lastVisitAt: lastVisit === undefined ? null : toIso(lastVisit),
      rewardExpiresAt: ready && lastVisit !== undefined ? toIso(addDays(lastVisit, 30)) : null,
    },
    ledger,
  }
}

const DAY = 24

export function buildExampleSeed(now: Date): MockState {
  const shops = [
    shop(S.barbershop, 'Barbearia Navalha', 'barbershop', 'Centro', EXAMPLE_IDS.checkInCodes.barbershop),
    shop(S.cafe, 'Café da Orla', 'cafe', 'Lapa', EXAMPLE_IDS.checkInCodes.cafe),
    shop(S.pizzeria, 'Pizzaria Forno a Lenha', 'pizzeria', 'Santos Dumont', EXAMPLE_IDS.checkInCodes.pizzeria),
    shop(S.petShop, 'Pet Amigo', 'petShop', 'Vila Nova', EXAMPLE_IDS.checkInCodes.petShop),
    shop(S.gym, 'Academia Movimento', 'gym', 'Jardim Alvorada', EXAMPLE_IDS.checkInCodes.gym, 'pending'),
    shop(S.bakery, 'Padaria Pão da Hora', 'bakery', 'Centro', EXAMPLE_IDS.checkInCodes.bakery),
    shop(S.beauty, 'Studio Bela', 'beauty', 'Lapa', EXAMPLE_IDS.checkInCodes.beauty),
  ]
  const barbershop = program(S.barbershop, 'Corte grátis', { mode: 'stamps', target: 10 }, 4)
  const cafe = program(S.cafe, 'Café com pão de queijo', { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 150 }, 4, {
    ...defaultBonus,
    welcomeBonus: { enabled: false, units: 2 },
  })
  const pizzeria = program(S.pizzeria, 'Pizza média', { mode: 'stamps', target: 8 }, DAY)
  const petShop = program(S.petShop, 'Banho grátis', { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 }, DAY, {
    ...defaultBonus,
    welcomeBonus: { enabled: true, units: 10 },
  })
  const gym = program(S.gym, 'Uma semana grátis', { mode: 'stamps', target: 12 }, DAY)
  const bakery = program(S.bakery, 'Pão de queijo grande', { mode: 'stamps', target: 10 }, 4)
  const beauty = program(S.beauty, 'Escova grátis', { mode: 'stamps', target: 6 }, DAY, {
    ...defaultBonus,
    welcomeBonus: { enabled: false, units: 2 },
  })

  let ledgerCounter = 0
  const ledgerIds = { next: (): string => `visit_seed_${String((ledgerCounter += 1)).padStart(3, '0')}` }
  const histories: CardHistory[] = [
    { customerId: C.ana, program: barbershop, visitsHoursAgo: [80 * DAY, 66 * DAY, 52 * DAY, 38 * DAY, 24 * DAY, 10 * DAY] },
    { customerId: C.ana, program: cafe, visitsHoursAgo: [20 * DAY, 9 * DAY, 2 * DAY], amountCents: 3200 },
    { customerId: C.ana, program: pizzeria, visitsHoursAgo: [70 * DAY, 56 * DAY, 42 * DAY, 28 * DAY, 14 * DAY, 3 * DAY], source: 'checkIn' },
    { customerId: C.ana, program: petShop, visitsHoursAgo: [40 * DAY] },
    { customerId: C.joao, program: barbershop, visitsHoursAgo: [75 * DAY, 45 * DAY] },
    { customerId: C.maria, program: barbershop, visitsHoursAgo: [60 * DAY, 40 * DAY, 25 * DAY, 12 * DAY, 3, 1] },
    { customerId: C.pedro, program: barbershop, visitsHoursAgo: [2] },
  ]
  const built = histories.map((history) => buildHistory(now, history, ledgerIds))

  return {
    version: MOCK_STATE_VERSION,
    shops,
    programs: [barbershop, cafe, pizzeria, petShop, gym, bakery, beauty],
    customers: [
      customer(C.ana, P.ana, 'Ana', true, addHours(now, -90 * DAY)),
      customer(C.joao, P.joao, 'João', true, addHours(now, -80 * DAY)),
      customer(C.maria, P.maria, 'Maria', false, addHours(now, -60 * DAY)),
      customer(C.pedro, P.pedro, null, false, addHours(now, -2)),
    ],
    merchants: [
      { id: EXAMPLE_IDS.merchants.barbershop, phone: P.barbershopMerchant, shopId: S.barbershop },
      { id: EXAMPLE_IDS.merchants.cafe, phone: P.cafeMerchant, shopId: S.cafe },
    ],
    cards: built.map((item) => item.card),
    ledger: built.flatMap((item) => item.ledger),
    redemptions: [],
    loginChallenges: [],
    challenges: [
      {
        id: ChallengeIdSchema.parse('challenge_tres_lojas'),
        title: 'Conheça 3 lojas da rede',
        description: 'Faça uma visita em cada uma destas lojas até o fim do mês.',
        shopIds: [S.cafe, S.bakery, S.beauty],
        requiredVisits: 3,
        startsAt: toIso(addHours(now, -10 * DAY)),
        endsAt: toIso(addHours(now, 20 * DAY)),
      },
    ],
  }
}
