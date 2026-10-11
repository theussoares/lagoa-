import { LAPSED_AFTER_DAYS } from '../constants/domain'
import type { IsoDateTime } from '../schemas/common'
import type { MerchantCustomerRow } from '../schemas/customer'
import { addDays } from '../utils/time'

type ReminderTarget = Pick<MerchantCustomerRow, 'isLapsed' | 'acceptsNotifications'>

/**
 * Última visita que ainda deixa o cliente sumido: mais de LAPSED_AFTER_DAYS dias completos atrás. A API filtra por este
 * instante no SQL; `isLapsedSince` usa o mesmo, para tela e banco nunca discordarem.
 */
export function lapsedCutoff(now: Date): Date {
  return addDays(now, -(LAPSED_AFTER_DAYS + 1))
}

/** Sem visita há mais de LAPSED_AFTER_DAYS. Cartão sem visita nenhuma não conta como sumido. */
export function isLapsedSince(lastVisitAt: IsoDateTime | null, now: Date): boolean {
  return lastVisitAt !== null && new Date(lastVisitAt).getTime() <= lapsedCutoff(now).getTime()
}

/** Lembrete de cliente sumido só vai para quem aceitou avisos (LGPD). */
export function isReachableForReminder(customer: ReminderTarget): boolean {
  return customer.isLapsed && customer.acceptsNotifications
}
