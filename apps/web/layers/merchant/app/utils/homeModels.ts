import { formatCurrency } from '#shared/utils/currency'
import type { Translate } from '#layers/core/app/types/i18n'
import type { HomeStatCard, HomeStatInput } from '../types/home'

/** Os números do Início em cards: vendas, visitas, prêmios e sumidos. Cada card tem uma nota curta embaixo. */
export function toHomeStatCards({ week, lapsedTotal, reachable }: HomeStatInput, t: Translate): HomeStatCard[] {
  return [
    {
      id: 'sales',
      label: t('home.stats.sales'),
      value: formatCurrency(week.amountCents),
      note: t('home.week.customers', { count: week.customers }, week.customers),
    },
    {
      id: 'visits',
      label: t('home.stats.visits'),
      value: String(week.visits),
      note: t('home.week.newCustomers', { count: week.newCustomers }, week.newCustomers),
    },
    {
      id: 'redemptions',
      label: t('home.stats.redemptions'),
      value: String(week.redemptions),
      note: null,
    },
    {
      id: 'lapsed',
      label: t('home.lapsed.title'),
      value: String(lapsedTotal),
      note: reachable === null ? null : t('home.lapsed.reachable', { count: reachable }, reachable),
    },
  ]
}
