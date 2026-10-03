import { addHours } from '../utils/time'

/**
 * Janela de check-in: qualquer visita (balcão ou check-in) segura o próximo check-in na loja.
 * Devolve quando libera, ou `null` se já pode.
 */
export function checkInAvailableAt(lastVisitAt: Date | null, cooldownHours: number, now: Date): Date | null {
  if (lastVisitAt === null) return null
  const availableAt = addHours(lastVisitAt, cooldownHours)
  return availableAt > now ? availableAt : null
}
