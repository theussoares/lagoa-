import { WEEK_SUMMARY_DAYS } from '#shared/constants/domain'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import { PILOT_TIME_ZONE } from '#shared/utils/time'
import type { Translate } from '#layers/core/app/utils/translate'

const dayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: PILOT_TIME_ZONE })
/** Meio-dia UTC cai no mesmo dia em Três Lagoas (UTC−4). */
const NOON_UTC = 'T12:00:00Z'

export interface WeekDayRow {
  readonly isoDate: string
  readonly label: string
  readonly isToday: boolean
  /** "3 visitas". */
  readonly visits: string
  /** 0 a 1, relativo ao dia mais movimentado da semana. */
  readonly ratio: number
  /** "1 cliente novo · 1 prêmio entregue"; `null` sem nada além de visitas. */
  readonly detail: string | null
}

export interface LapsedPreviewLabels {
  readonly caption: string
  readonly noName: string
}

/** Os números da semana numa frase, não em cards de métrica. */
export function toWeekHeadline(week: WeekSummary, t: Translate): string {
  if (week.visits === 0 && week.redemptions === 0) return t('home.week.headlineEmpty', { days: WEEK_SUMMARY_DAYS })
  if (week.visits === 0) {
    return t('home.week.headlineOnlyRedemptions', {
      days: WEEK_SUMMARY_DAYS,
      redemptions: t('home.week.redemptions', { count: week.redemptions }, week.redemptions),
    })
  }
  return t('home.week.headline', {
    days: WEEK_SUMMARY_DAYS,
    visits: t('home.week.visits', { count: week.visits }, week.visits),
    customers: t('home.week.customers', { count: week.customers }, week.customers),
    newCustomers: t('home.week.newCustomers', { count: week.newCustomers }, week.newCustomers),
    redemptions: t('home.week.redemptions', { count: week.redemptions }, week.redemptions),
  })
}

export function toWeekDayRows(week: WeekSummary, t: Translate): WeekDayRow[] {
  const busiest = Math.max(1, ...week.days.map((day) => day.visits))
  const today = week.days.at(-1)?.isoDate
  return week.days.map((day) => {
    const isToday = day.isoDate === today
    const details = [
      day.newCustomers > 0 ? t('home.week.newCustomers', { count: day.newCustomers }, day.newCustomers) : null,
      day.redemptions > 0 ? t('home.week.redemptions', { count: day.redemptions }, day.redemptions) : null,
    ].filter((detail): detail is string => detail !== null)
    const date = dayFormat.format(new Date(`${day.isoDate}${NOON_UTC}`))
    return {
      isoDate: day.isoDate,
      label: isToday ? t('home.week.today', { date }) : date,
      isToday,
      visits: t('home.week.visits', { count: day.visits }, day.visits),
      ratio: day.visits / busiest,
      detail: details.length > 0 ? details.join(' · ') : null,
    }
  })
}
