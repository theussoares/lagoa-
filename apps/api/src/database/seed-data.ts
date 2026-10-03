import type { BonusRules, ProgramMode } from '#shared/schemas/program'
import type { ShopCategory, ShopStatus } from '#shared/schemas/shop'

/** Dados fictícios de desenvolvimento. Celular na faixa de teste 67 90000-00xx; ids fixos para o reset achar. */
export const SEED_OWNER_ID = '0190ae00-0000-7000-8000-00000000f001'
export const SEED_OWNER_PHONE = '67900000010'
export const SEED_OWNER_EMAIL = 'dono.seed@lagoamais.test'

const BONUS_ON: BonusRules = {
  welcomeBonus: { enabled: true, units: 2 },
  birthdayMultiplier: { enabled: true, multiplier: 2 },
  referralBonus: { enabled: true, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}
const BONUS_OFF: BonusRules = {
  welcomeBonus: { enabled: false, units: 1 },
  birthdayMultiplier: { enabled: false, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}

export interface SeedShop {
  readonly id: string
  readonly programId: string
  readonly name: string
  readonly category: ShopCategory
  readonly neighborhood: string
  readonly addressLine: string
  readonly checkInCode: string
  readonly status: ShopStatus
  readonly program: {
    readonly rewardTitle: string
    readonly mode: ProgramMode
    readonly earnUnits: number
    readonly target: number
    readonly bonusRules: BonusRules
    readonly checkInCooldownHours: number
  }
}

const shop = (n: number, rest: Omit<SeedShop, 'id' | 'programId'>): SeedShop => ({
  id: `0190ae00-0000-7000-8000-0000000000a${n}`,
  programId: `0190ae00-0000-7000-8000-0000000000b${n}`,
  ...rest,
})

export const SEED_SHOPS: readonly SeedShop[] = [
  shop(1, {
    name: 'Barbearia Navalha',
    category: 'barbershop',
    neighborhood: 'Centro',
    addressLine: 'Rua Antônio Trajano, 100',
    checkInCode: 'NAV4K7',
    status: 'approved',
    program: { rewardTitle: 'Corte grátis', mode: 'stamps', earnUnits: 1, target: 10, bonusRules: BONUS_ON, checkInCooldownHours: 24 },
  }),
  shop(2, {
    name: 'Café Lagoa',
    category: 'cafe',
    neighborhood: 'Jardim Alvorada',
    addressLine: 'Av. Rosário Congro, 450',
    checkInCode: 'CAF3H9',
    status: 'approved',
    program: { rewardTitle: 'Café com pão de queijo', mode: 'pointsPerCurrency', earnUnits: 2, target: 200, bonusRules: BONUS_OFF, checkInCooldownHours: 4 },
  }),
  shop(3, {
    name: 'Pizzaria Forno a Lenha',
    category: 'pizzeria',
    neighborhood: 'Vila Nova',
    addressLine: 'Rua Dom Aquino, 800',
    checkInCode: 'PIZ7M2',
    status: 'approved',
    program: { rewardTitle: 'Pizza média', mode: 'pointsPerVisit', earnUnits: 10, target: 100, bonusRules: BONUS_ON, checkInCooldownHours: 24 },
  }),
  shop(4, {
    name: 'Padaria em análise',
    category: 'bakery',
    neighborhood: 'Centro',
    addressLine: 'Rua Paranaíba, 12',
    checkInCode: 'PAD2R6',
    status: 'pending',
    program: { rewardTitle: 'Pão grátis', mode: 'stamps', earnUnits: 1, target: 8, bonusRules: BONUS_OFF, checkInCooldownHours: 12 },
  }),
  shop(5, {
    name: 'Academia suspensa',
    category: 'gym',
    neighborhood: 'Santos Dumont',
    addressLine: 'Av. Ranulpho Marques Leal, 77',
    checkInCode: 'GYM8T3',
    status: 'suspended',
    program: { rewardTitle: 'Dia grátis', mode: 'stamps', earnUnits: 1, target: 12, bonusRules: BONUS_OFF, checkInCooldownHours: 24 },
  }),
]
