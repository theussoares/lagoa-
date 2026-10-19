import { afterEach, describe, expect, it } from 'vitest'
import type { CustomerId } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { HomeOverview } from '#shared/schemas/homeOverview'
import { mountComponent, unmountAll } from '#layers/core/test/componentHarness.nuxt'
import HomeDashboardHeader from '../app/components/home/HomeDashboardHeader.vue'
import HomeIndicatorCards from '../app/components/home/HomeIndicatorCards.vue'
import HomeRecentActivity from '../app/components/home/HomeRecentActivity.vue'
import HomeActiveCampaigns from '../app/components/home/HomeActiveCampaigns.vue'
import HomeComparisonChart from '../app/components/home/HomeComparisonChart.vue'
import HomeOpportunities from '../app/components/home/HomeOpportunities.vue'

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

function mockOverview(overrides: Partial<HomeOverview> = {}): HomeOverview {
  return {
    lapsed: { total: 12, oldestLastVisitAt: '2026-08-15T10:00:00Z' },
    nearReward: { total: 5 },
    rewardReady: { total: 3 },
    totalCustomers: 85,
    comparison: {
      week: {
        newCustomers: { current: 5, previous: 3 },
        visits: { current: 28, previous: 20 },
        purchases: { current: 18, previous: 15 },
        redemptions: { current: 2, previous: 1 },
      },
      month: {
        newCustomers: { current: 20, previous: 15 },
        visits: { current: 90, previous: 80 },
        purchases: { current: 60, previous: 50 },
        redemptions: { current: 8, previous: 5 },
      },
      last30: {
        newCustomers: { current: 25, previous: 20 },
        visits: { current: 120, previous: 100 },
        purchases: { current: 80, previous: 70 },
        redemptions: { current: 10, previous: 7 },
      },
    },
    activity: [
      {
        id: '1',
        kind: 'visit',
        customerId: 'cus_1' as CustomerId,
        name: 'Carlos Silva',
        maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-0871'),
        units: 1,
        unit: 'stamp',
        amountCents: null,
        rewardTitle: null,
        createdAt: '2026-10-19T10:00:00Z',
      },
      {
        id: '2',
        kind: 'purchase',
        customerId: 'cus_2' as CustomerId,
        name: 'Maria Souza',
        maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-1234'),
        units: 2,
        unit: 'stamp',
        amountCents: 4500,
        rewardTitle: null,
        createdAt: '2026-10-19T09:30:00Z',
      },
    ],
    ...overrides,
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
  it('renders 4 metric cards including lapsed and near reward with action links', async () => {
    const week = mockWeek({ customers: 87, redemptions: 32, newCustomers: 12 })
    const overview = mockOverview({
      lapsed: { total: 14, oldestLastVisitAt: '2026-08-10T10:00:00Z' },
      nearReward: { total: 6 },
      totalCustomers: 120,
    })
    const program = mockProgram()

    const page = await mountComponent(HomeIndicatorCards, {
      week,
      overview,
      program,
    })

    expect(page.text()).toContain('Clientes ativos')
    expect(page.text()).toContain('87')
    expect(page.text()).toContain('de 120 cadastrados')

    expect(page.text()).toContain('Clientes sumidos')
    expect(page.text()).toContain('14')
    expect(page.text()).toContain('Detalhes')

    expect(page.text()).toContain('Prêmios entregues')
    expect(page.text()).toContain('32')

    expect(page.text()).toContain('Perto do prêmio')
    expect(page.text()).toContain('6')
    expect(page.text()).toContain('Detalhes')
  })
})

describe('HomeComparisonChart', () => {
  it('renders comparison title, period switcher and metric values', async () => {
    const overview = mockOverview()
    const program = mockProgram()

    const page = await mountComponent(HomeComparisonChart, {
      comparison: overview.comparison,
      program,
    })

    expect(page.text()).toContain('Resumo do mês')
    expect(page.text()).toContain('Esta semana')
    expect(page.text()).toContain('Este mês')
    expect(page.text()).toContain('Últimos 30 dias')
    expect(page.text()).toContain('Cadastrados')
    expect(page.text()).toContain('Visitas')
    expect(page.text()).toContain('Compras')
    expect(page.text()).toContain('Resgates')
  })
})

describe('HomeOpportunities', () => {
  it('renders actionable opportunity alerts', async () => {
    const overview = mockOverview({
      lapsed: { total: 12, oldestLastVisitAt: null },
      nearReward: { total: 5 },
      rewardReady: { total: 3 },
    })
    const program = mockProgram()

    const page = await mountComponent(HomeOpportunities, {
      overview,
      program,
    })

    expect(page.text()).toContain('Resumo de oportunidades')
    expect(page.text()).toContain('12 clientes sumidos há mais de 30 dias')
    expect(page.text()).toContain('5 clientes próximos de ganhar um prêmio')
    expect(page.text()).toContain('3 prêmios disponíveis para resgate')
  })

  it('renders empty state when there are no alerts', async () => {
    const overview = mockOverview({
      lapsed: { total: 0, oldestLastVisitAt: null },
      nearReward: { total: 0 },
      rewardReady: { total: 0 },
    })
    const program = mockProgram()

    const page = await mountComponent(HomeOpportunities, {
      overview,
      program,
    })

    expect(page.text()).toContain('Tudo em dia por aqui!')
  })
})

describe('HomeRecentActivity', () => {
  it('displays activity list with customer name and event details', async () => {
    const overview = mockOverview()

    const page = await mountComponent(HomeRecentActivity, {
      activity: overview.activity,
    })

    expect(page.text()).toContain('Atividade recente do clube')
    expect(page.text()).toContain('Carlos Silva')
    expect(page.text()).toContain('Visita registrada')
    expect(page.text()).toContain('Maria Souza')
    expect(page.text()).toContain('Compra lançada')
    expect(page.text()).toContain('45,00')
  })

  it('renders empty state when activity is empty', async () => {
    const page = await mountComponent(HomeRecentActivity, {
      activity: [],
    })

    expect(page.text()).toContain('Nenhuma atividade registrada ainda.')
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
