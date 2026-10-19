import type { IsoDateTime } from '../schemas/common'
import type { CustomerId } from '../schemas/ids'
import type { LedgerKind } from '../schemas/visit'
import type { HomeMetrics, HomePeriod } from '../schemas/homeOverview'
import { isVisitKind } from './ledger'
import { addDays, addHours, localDateParts, PILOT_UTC_OFFSET_HOURS, startOfLocalDay } from '../utils/time'

export interface LedgerComparisonRecord {
  readonly kind: LedgerKind
  readonly createdAt: IsoDateTime | Date
  readonly amountCents?: number | null
}

export interface CustomerRegistrationRecord {
  readonly customerId: CustomerId | string
  readonly createdAt: IsoDateTime | Date
}

interface DateRange {
  readonly start: Date
  readonly end: Date
}

function toMs(d: IsoDateTime | Date): number {
  return typeof d === 'string' ? new Date(d).getTime() : d.getTime()
}

function countMetrics(
  records: readonly LedgerComparisonRecord[],
  newCustomers: readonly CustomerRegistrationRecord[],
  range: DateRange,
): { newCustomers: number; visits: number; purchases: number; redemptions: number } {
  const startMs = range.start.getTime()
  const endMs = range.end.getTime()

  // Clientes únicos cadastrados no intervalo
  const seenCustomers = new Set<string>()
  for (const c of newCustomers) {
    const t = toMs(c.createdAt)
    if (t >= startMs && t <= endMs) {
      seenCustomers.add(c.customerId)
    }
  }

  let visits = 0
  let purchases = 0
  let redemptions = 0

  for (const r of records) {
    const t = toMs(r.createdAt)
    if (t < startMs || t > endMs) continue

    if (isVisitKind(r.kind)) {
      visits += 1
      if (r.amountCents !== null && r.amountCents !== undefined && r.amountCents > 0) {
        purchases += 1
      }
    } else if (r.kind === 'redemption') {
      redemptions += 1
    }
  }

  return {
    newCustomers: seenCustomers.size,
    visits,
    purchases,
    redemptions,
  }
}

export function getComparisonRanges(now: Date): Record<HomePeriod, { current: DateRange; previous: DateRange }> {
  const localDayStart = startOfLocalDay(now)

  // 1. Semana: últimos 7 dias (terminando em now) vs 7 dias anteriores
  const weekCurrent: DateRange = {
    start: addDays(localDayStart, -6),
    end: now,
  }
  const weekPrevious: DateRange = {
    start: addDays(localDayStart, -13),
    end: addDays(now, -7),
  }

  // 2. Mês: dia 1 até now vs dia 1 até o mesmo dia/hora do mês anterior
  const localNow = addHours(now, PILOT_UTC_OFFSET_HOURS)
  const currentYear = localNow.getUTCFullYear()
  const currentMonthIndex = localNow.getUTCMonth() // 0-11
  const currentDay = localNow.getUTCDate()

  const startCurrentMonthUtc = new Date(Date.UTC(currentYear, currentMonthIndex, 1, -PILOT_UTC_OFFSET_HOURS))

  const prevYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
  const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonthIndex + 1, 0)).getUTCDate()
  const prevDay = Math.min(currentDay, daysInPrevMonth)

  const startPrevMonthUtc = new Date(Date.UTC(prevYear, prevMonthIndex, 1, -PILOT_UTC_OFFSET_HOURS))
  const endPrevMonthUtc = new Date(
    Date.UTC(
      prevYear,
      prevMonthIndex,
      prevDay,
      localNow.getUTCHours() - PILOT_UTC_OFFSET_HOURS,
      localNow.getUTCMinutes(),
      localNow.getUTCSeconds(),
      localNow.getUTCMilliseconds(),
    ),
  )

  const monthCurrent: DateRange = {
    start: startCurrentMonthUtc,
    end: now,
  }
  const monthPrevious: DateRange = {
    start: startPrevMonthUtc,
    end: endPrevMonthUtc,
  }

  // 3. Últimos 30 dias: 30 dias (terminando em now) vs 30 dias anteriores
  const last30Current: DateRange = {
    start: addDays(localDayStart, -29),
    end: now,
  }
  const last30Previous: DateRange = {
    start: addDays(localDayStart, -59),
    end: addDays(now, -30),
  }

  return {
    week: { current: weekCurrent, previous: weekPrevious },
    month: { current: monthCurrent, previous: monthPrevious },
    last30: { current: last30Current, previous: last30Previous },
  }
}

export function summarizeComparison(
  records: readonly LedgerComparisonRecord[],
  newCustomers: readonly CustomerRegistrationRecord[],
  now: Date,
): Record<HomePeriod, HomeMetrics> {
  const ranges = getComparisonRanges(now)

  const computePeriod = (period: HomePeriod): HomeMetrics => {
    const { current: currentRange, previous: prevRange } = ranges[period]
    const cur = countMetrics(records, newCustomers, currentRange)
    const prev = countMetrics(records, newCustomers, prevRange)

    return {
      newCustomers: { current: cur.newCustomers, previous: prev.newCustomers },
      visits: { current: cur.visits, previous: prev.visits },
      purchases: { current: cur.purchases, previous: prev.purchases },
      redemptions: { current: cur.redemptions, previous: prev.redemptions },
    }
  }

  return {
    week: computePeriod('week'),
    month: computePeriod('month'),
    last30: computePeriod('last30'),
  }
}
