import type { IsoDateTime } from '../schemas/common'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function toIso(date: Date): IsoDateTime {
  return date.toISOString()
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS)
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * HOUR_MS)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime())
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS)
}

/** Data local no fuso da cidade do piloto (Três Lagoas, UTC−4, sem horário de verão). */
export const PILOT_UTC_OFFSET_HOURS = -4
/** Mesmo fuso, para formatar hora com `Intl`. */
export const PILOT_TIME_ZONE = 'America/Campo_Grande'

/** Dias de calendário no fuso do piloto entre duas datas; nunca negativo. */
export function calendarDaysBetween(from: Date, to: Date): number {
  const fromDay = Date.parse(localDateParts(from).isoDate)
  const toDay = Date.parse(localDateParts(to).isoDate)
  return Math.max(0, Math.round((toDay - fromDay) / DAY_MS))
}

export function localDateParts(date: Date): { isoDate: string; monthDay: string } {
  const local = addHours(date, PILOT_UTC_OFFSET_HOURS)
  const isoDate = local.toISOString().slice(0, 10)
  return { isoDate, monthDay: isoDate.slice(5) }
}
