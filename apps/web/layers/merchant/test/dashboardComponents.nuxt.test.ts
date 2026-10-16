import { afterEach, describe, expect, it } from 'vitest'
import type { CustomerId } from '#shared/schemas/ids'
import type { MerchantCustomerPage, MerchantCustomerRow } from '#shared/schemas/customer'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import HomeDashboardHeader from '../app/components/home/HomeDashboardHeader.vue'
import HomeIndicatorCards from '../app/components/home/HomeIndicatorCards.vue'
import HomeRecentCustomers from '../app/components/home/HomeRecentCustomers.vue'
import HomeActiveCampaigns from '../app/components/home/HomeActiveCampaigns.vue'
import HomeShopSummaryChart from '../app/components/home/HomeShopSummaryChart.vue'
import HomeUpcomingRedemptions from '../app/components/home/HomeUpcomingRedemptions.vue'

afterEach(unmountAll)

function mockWeek(overrides: Partial<WeekSummary> = {}): WeekSummary {
  const days = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((isoDate, index) => ({
    isoDate,
    visits: (index + 1) * 2,
    newCustomers: 1,
    redemptions: index === 6 ? 2 : 0,
    amountCents: (index + 1) * 1000,
  }))
  return {
    days,
    visits: 28,
    customers: 15,
    newCustomers: 7,
    redemptions: 2,
    amountCents: 28000,
    ...overrides,
  }
}

function mockCustomer(id: string, firstName: string, balance: number, lastVisitAt: string | null = null): MerchantCustomerRow {
  return {
    customerId: id as CustomerId,
    firstName,
    maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-0871'),
    balance,
    target: 100,
    unit: 'point',
    visitsCount: 3,
    lastVisitAt,
    isLapsed: false,
    acceptsNotifications: true,
    lastAmountCents: 5000,
  }
}

function mockProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'prg_test' as any,
    shopId: 'shp_test' as any,
    reward: { title: 'Corte de cabelo + Barba' },
    rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 120 },
    bonusRules: {
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      welcomeBonus: { enabled: true, units: 10 },
      referralBonus: { enabled: false, units: 5 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24, cooldownMode: 'calendarDay' },
    ...overrides,
  }
}

describe('HomeDashboardHeader', () => {
  it('renders title, subtitle, shop name and emits refresh', async () => {
    const page = await mountComponent(HomeDashboardHeader, {
      shopName: 'Caju Barbearia',
      loading: false,
    })

    expect(page.text()).toContain('Início')
    expect(page.text()).toContain('Caju Barbearia')
    expect(page.text()).toContain('Acompanhe o desempenho do seu clube')

    const refreshBtn = page.get('button[aria-label="Atualizar o Início"]')
    await refreshBtn.trigger('click')
    expect(page.emitted('refresh')).toHaveLength(1)
  })
})

describe('HomeIndicatorCards', () => {
  it('renders 4 metric cards with formatted numbers', async () => {
    const week = mockWeek({ customers: 87, redemptions: 32, newCustomers: 12 })
    const allCustomers: MerchantCustomerPage = {
      items: [mockCustomer('1', 'João', 100), mockCustomer('2', 'Bruno', 50)],
      total: 120,
      acceptingNotifications: 100,
      nextCursor: null,
    }
    const program = mockProgram({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 } })

    const page = await mountComponent(HomeIndicatorCards, {
      week,
      allCustomers,
      program,
    })

    expect(page.text()).toContain('Clientes ativos')
    expect(page.text()).toContain('87')
    expect(page.text()).toContain('de 120 cadastrados')
    expect(page.text()).toContain('Pontos resgatados')
    expect(page.text()).toContain('Prêmios entregues')
    expect(page.text()).toContain('32')
    expect(page.text()).toContain('Saldo de pontos (total)')
    expect(page.text()).toContain('150')
  })
})

describe('HomeRecentCustomers', () => {
  it('displays table of recent customers with initials and masked phone', async () => {
    const customers = [
      mockCustomer('1', 'João Victor', 110, '2026-10-12T10:00:00Z'),
      mockCustomer('2', 'Bruno Henrique', 80, '2026-10-10T10:00:00Z'),
    ]

    const page = await mountComponent(HomeRecentCustomers, {
      customers,
      unit: 'point',
    })

    expect(page.text()).toContain('Últimos clientes')
    expect(page.text()).toContain('João Victor')
    expect(page.text()).toContain('Bruno Henrique')
    expect(page.text()).toContain('JV')
    expect(page.text()).toContain('BH')
    expect(page.text()).toContain('110')
    expect(page.text()).toContain('80')
    expect(page.text()).toContain('(67) 9••••-0871')
  })

  it('renders empty state when customer list is empty', async () => {
    const page = await mountComponent(HomeRecentCustomers, {
      customers: [],
      unit: 'point',
    })

    expect(page.text()).toContain('Nenhum cliente cadastrado ainda.')
  })
})

describe('HomeActiveCampaigns', () => {
  it('displays birthday and welcome bonus campaigns when enabled', async () => {
    const program = mockProgram()
    const page = await mountComponent(HomeActiveCampaigns, {
      program,
      campaignsOverview: null,
      campaignsEnabled: false,
    })

    expect(page.text()).toContain('Campanhas ativas')
    expect(page.text()).toContain('Aniversário do clube')
    expect(page.text()).toContain('Em andamento')
    expect(page.text()).toContain('Boas-vindas')
  })
})

describe('HomeShopSummaryChart', () => {
  it('renders 7 bars with date labels and values', async () => {
    const week = mockWeek()
    const program = mockProgram()

    const page = await mountComponent(HomeShopSummaryChart, {
      week,
      program,
    })

    expect(page.text()).toContain('Resumo da loja')
    expect(page.text()).toContain('Pontos acumulados')
    expect(page.text()).toContain('Últimos 7 dias')
  })
})

describe('HomeUpcomingRedemptions', () => {
  it('renders available rewards when customers are ready', async () => {
    const program = mockProgram()
    const readyCustomers: MerchantCustomerPage = {
      items: [mockCustomer('1', 'João', 120)],
      total: 1,
      acceptingNotifications: 1,
      nextCursor: null,
    }

    const page = await mountComponent(HomeUpcomingRedemptions, {
      program,
      readyCustomers,
      allCustomers: readyCustomers,
    })

    expect(page.text()).toContain('Próximos resgates')
    expect(page.text()).toContain('Corte de cabelo + Barba')
    expect(page.text()).toContain('120 pontos')
    expect(page.text()).toContain('Disponível')
  })
})
