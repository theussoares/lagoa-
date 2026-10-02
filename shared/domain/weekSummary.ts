import { WEEK_SUMMARY_DAYS } from '../constants/domain'
import type { IsoDateTime } from '../schemas/common'
import type { CustomerId } from '../schemas/ids'
import type { LedgerKind } from '../schemas/visit'
import type { DaySummary, WeekSummary } from '../schemas/weekSummary'
import { addDays, localDateParts } from '../utils/time'
import { isVisitKind } from './ledger'

export interface WeekLedgerRecord {
  readonly customerId: CustomerId
  readonly kind: LedgerKind
  readonly createdAt: IsoDateTime
}

function localDate(iso: IsoDateTime): string {
  return localDateParts(new Date(iso)).isoDate
}

function weekDates(now: Date): string[] {
  return Array.from({ length: WEEK_SUMMARY_DAYS }, (_, index) =>
    localDateParts(addDays(now, index - (WEEK_SUMMARY_DAYS - 1))).isoDate,
  )
}

/**
 * Dia da primeira visita de cada cliente nesta loja. "Novo" é novo na loja,
 * venha do Balcão ou do check-in, mesmo que já tenha cartão em outra loja da rede.
 */
function firstVisitDates(records: readonly WeekLedgerRecord[]): Map<CustomerId, string> {
  const first = new Map<CustomerId, IsoDateTime>()
  for (const record of records) {
    if (!isVisitKind(record.kind)) continue
    const previous = first.get(record.customerId)
    if (previous === undefined || Date.parse(record.createdAt) < Date.parse(previous)) first.set(record.customerId, record.createdAt)
  }
  return new Map([...first].map(([customerId, createdAt]) => [customerId, localDate(createdAt)]))
}

function summarizeDay(isoDate: string, records: readonly WeekLedgerRecord[], firstVisits: Map<CustomerId, string>): DaySummary {
  const visits = records.filter((record) => isVisitKind(record.kind))
  const newCustomers = new Set(visits.map((record) => record.customerId).filter((customerId) => firstVisits.get(customerId) === isoDate))
  return {
    isoDate,
    visits: visits.length,
    newCustomers: newCustomers.size,
    redemptions: records.filter((record) => record.kind === 'redemption').length,
  }
}

/**
 * Recebe toda a caderneta da loja (não só a semana), para saber quem é novo.
 * Dias de calendário no fuso do piloto, não "168 horas atrás": a semana fecha à meia-noite da cidade.
 */
export function summarizeWeek(records: readonly WeekLedgerRecord[], now: Date): WeekSummary {
  const dates = weekDates(now)
  const firstVisits = firstVisitDates(records)
  const byDate = new Map<string, WeekLedgerRecord[]>(dates.map((date) => [date, []]))
  for (const record of records) {
    byDate.get(localDate(record.createdAt))?.push(record)
  }
  const days = dates.map((date) => summarizeDay(date, byDate.get(date) ?? [], firstVisits))
  const visitors = new Set(
    [...byDate.values()].flat().filter((record) => isVisitKind(record.kind)).map((record) => record.customerId),
  )
  return {
    days,
    visits: days.reduce((total, day) => total + day.visits, 0),
    customers: visitors.size,
    newCustomers: days.reduce((total, day) => total + day.newCustomers, 0),
    redemptions: days.reduce((total, day) => total + day.redemptions, 0),
  }
}
