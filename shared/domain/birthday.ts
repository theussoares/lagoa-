import { BIRTHDAY_CHANGE_COOLDOWN_DAYS } from '../constants/domain'
import { addDays } from '../utils/time'

/** Quando o aniversário pode ser trocado de novo; `null` = já pode (ou nunca foi trocado). */
export function birthdayChangeableAt(changedAt: Date | null, now: Date): Date | null {
  if (changedAt === null) return null
  const changeableAt = addDays(changedAt, BIRTHDAY_CHANGE_COOLDOWN_DAYS)
  return changeableAt > now ? changeableAt : null
}
