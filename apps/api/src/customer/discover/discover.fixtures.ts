import type { BonusRules } from '#shared/schemas/program'
import type { DiscoverShop } from './discover.repository'

export const NO_BONUS: BonusRules = {
  welcomeBonus: { enabled: false, units: 1 },
  birthdayMultiplier: { enabled: false, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}

export function discoverShop(overrides: Partial<DiscoverShop> = {}): DiscoverShop {
  return {
    id: '0190a000-0000-7000-8000-0000000000a1',
    name: 'Barbearia do Zé',
    category: 'barbershop',
    neighborhood: 'Centro',
    addressLine: 'Rua Antônio Trajano, 100',
    logoPath: null,
    program: { mode: 'stamps', earnUnits: 1, target: 10, rewardTitle: 'Corte grátis', bonusRules: NO_BONUS },
    ...overrides,
  }
}
