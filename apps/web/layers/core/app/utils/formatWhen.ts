import { formatShortDate, formatTime } from '#shared/utils/dateFormat'
import { addDays, localDateParts } from '#shared/utils/time'
import type { Translate } from '../types/i18n'

/** "hoje às 18:40", "amanhã às 09:00", "em 5 de out. às 09:00": no fuso da cidade. */
export function formatWhen(iso: string, now: Date, t: Translate): string {
  const time = formatTime(iso)
  const day = localDateParts(new Date(iso)).isoDate
  if (day === localDateParts(now).isoDate) return t('checkIn.when.today', { time })
  if (day === localDateParts(addDays(now, 1)).isoDate) return t('checkIn.when.tomorrow', { time })
  return t('checkIn.when.later', { date: formatShortDate(iso), time })
}
