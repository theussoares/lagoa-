import { BirthdaySchema } from '#shared/schemas/common'
import type { Birthday } from '#shared/schemas/common'
import { PILOT_TIME_ZONE } from '#shared/utils/time'

/** Ano bissexto de referência: 29 de fevereiro é um aniversário válido. */
const LEAP_REFERENCE_YEAR = 2024
const MONTHS_IN_YEAR = 12

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
const changeDateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: PILOT_TIME_ZONE })
const birthdayFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export interface BirthdayOption {
  readonly label: string
  readonly value: string
}

export interface BirthdayParts {
  readonly day: number | null
  readonly month: number | null
}

export function daysInMonth(month: number): number {
  return new Date(Date.UTC(LEAP_REFERENCE_YEAR, month, 0)).getUTCDate()
}

/** "janeiro" … "dezembro", na ordem do calendário. */
export function monthOptions(): BirthdayOption[] {
  return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => ({
    label: monthFormat.format(new Date(Date.UTC(LEAP_REFERENCE_YEAR, index, 1))),
    value: String(index + 1),
  }))
}

/** Dias do mês escolhido (31 enquanto o mês não foi escolhido). */
export function dayOptions(month: number | null): BirthdayOption[] {
  const count = month === null ? daysInMonth(1) : daysInMonth(month)
  return Array.from({ length: count }, (_, index) => ({ label: String(index + 1), value: String(index + 1) }))
}

export function splitBirthday(birthday: Birthday | null): BirthdayParts {
  if (birthday === null) return { day: null, month: null }
  const [month, day] = birthday.split('-').map(Number)
  return { day: day ?? null, month: month ?? null }
}

/** `null` enquanto falta dia ou mês, ou quando o dia não existe no mês (31 de abril). */
export function joinBirthday({ day, month }: BirthdayParts): Birthday | null {
  if (day === null || month === null || day > daysInMonth(month)) return null
  const parsed = BirthdaySchema.safeParse(`${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  return parsed.success ? parsed.data : null
}

/** "12 de março". */
export function formatBirthday(birthday: Birthday): string {
  const { day, month } = splitBirthday(birthday)
  return birthdayFormat.format(new Date(Date.UTC(LEAP_REFERENCE_YEAR, (month ?? 1) - 1, day ?? 1)))
}

/** "2 de outubro de 2027": a trava dura um ano, então o ano entra na frase. */
export function formatChangeableAt(iso: string): string {
  return changeDateFormat.format(new Date(iso))
}
