import { describe, expect, it } from 'vitest'
import {
  formatLongWeekdayDate,
  formatShortDate,
  formatShortDateTime,
  formatTime,
  formatWeekdayShortDate,
} from './dateFormat'
import { PILOT_TIME_ZONE } from './time'

// Referência: as opções `Intl` que as telas usavam antes de os formatos virarem funções compartilhadas.
const reference = {
  time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: PILOT_TIME_ZONE }),
  shortDate: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: PILOT_TIME_ZONE }),
  shortDateTime: new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PILOT_TIME_ZONE,
  }),
  weekdayShortDate: new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: PILOT_TIME_ZONE }),
  longWeekdayDate: new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PILOT_TIME_ZONE }),
}

const SAMPLES = [
  '2026-10-02T18:40:00.000Z',
  '2026-10-02T02:30:00.000Z', // ainda é dia 1 no fuso do piloto (UTC-4)
  '2026-10-02T04:00:00.000Z', // meia-noite no fuso do piloto
  '2026-12-31T23:59:00.000Z',
  '2024-02-29T12:00:00.000Z',
]

describe.each(SAMPLES)('dateFormat for %s', (iso) => {
  const date = new Date(iso)

  it('formatTime matches the original time format', () => {
    expect(formatTime(iso)).toBe(reference.time.format(date))
  })

  it('formatShortDate matches the original day format', () => {
    expect(formatShortDate(iso)).toBe(reference.shortDate.format(date))
  })

  it('formatShortDateTime matches the original campaign sent-at format', () => {
    expect(formatShortDateTime(iso)).toBe(reference.shortDateTime.format(date))
  })

  it('formatWeekdayShortDate matches the original week-day format', () => {
    expect(formatWeekdayShortDate(date)).toBe(reference.weekdayShortDate.format(date))
  })

  it('formatLongWeekdayDate matches the original counter heading format', () => {
    expect(formatLongWeekdayDate(date)).toBe(reference.longWeekdayDate.format(date))
  })
})

describe('dateFormat in the pilot time zone', () => {
  it('shows the city clock, not UTC', () => {
    expect(formatTime('2026-10-02T18:40:00.000Z')).toBe('14:40')
  })

  it('keeps the previous local day before the city midnight', () => {
    expect(formatShortDate('2026-10-02T02:30:00.000Z')).toBe(reference.shortDate.format(new Date('2026-10-01T12:00:00.000Z')))
  })

  it('moves to the next local day at the city midnight', () => {
    expect(formatShortDate('2026-10-02T04:00:00.000Z')).toBe(reference.shortDate.format(new Date('2026-10-02T12:00:00.000Z')))
  })
})
