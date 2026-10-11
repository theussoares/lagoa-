import type { CheckInCooldown } from '../schemas/program'
import { addHours, startOfLocalDay } from '../utils/time'

const HOURS_PER_DAY = 24

/** Quando termina a janela aberta por uma visita: horas corridas, ou a meia-noite local seguinte no `calendarDay`. */
export function cooldownEndsAt(visitAt: Date, cooldown: CheckInCooldown): Date {
  if (cooldown.cooldownMode === 'calendarDay') return addHours(startOfLocalDay(visitAt), HOURS_PER_DAY)
  return addHours(visitAt, cooldown.cooldownHours)
}

/**
 * Janela de check-in: qualquer visita (balcão ou check-in) segura o próximo check-in na loja.
 * Devolve quando libera, ou `null` se já pode.
 */
export function checkInAvailableAt(lastVisitAt: Date | null, cooldown: CheckInCooldown, now: Date): Date | null {
  if (lastVisitAt === null) return null
  const availableAt = cooldownEndsAt(lastVisitAt, cooldown)
  return availableAt > now ? availableAt : null
}
