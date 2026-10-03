import { PILOT_TIME_ZONE } from './time'

const LOCALE = 'pt-BR'

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: PILOT_TIME_ZONE })
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: PILOT_TIME_ZONE })
const shortDateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: PILOT_TIME_ZONE,
})
const weekdayShortDateFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: PILOT_TIME_ZONE })
const longWeekdayDateFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: PILOT_TIME_ZONE })

/** "14:32", no fuso da cidade. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "12 de set.", no fuso da cidade. */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso))
}

/** "12 de set. 14:32", no fuso da cidade. */
export function formatShortDateTime(iso: string): string {
  return shortDateTimeFormat.format(new Date(iso))
}

/** "sex., 2 de out.", no fuso da cidade. */
export function formatWeekdayShortDate(date: Date): string {
  return weekdayShortDateFormat.format(date)
}

/** "sexta-feira, 2 de outubro", no fuso da cidade. */
export function formatLongWeekdayDate(date: Date): string {
  return longWeekdayDateFormat.format(date)
}
