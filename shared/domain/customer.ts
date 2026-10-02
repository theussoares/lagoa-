import { LAPSED_AFTER_DAYS } from '../constants/domain'
import type { IsoDateTime } from '../schemas/common'
import type { MerchantCustomerRow } from '../schemas/customer'
import { daysBetween } from '../utils/time'

type ReminderTarget = Pick<MerchantCustomerRow, 'isLapsed' | 'acceptsNotifications'>

/** Sem visita há mais de LAPSED_AFTER_DAYS. Cartão sem visita nenhuma não conta como sumido. */
export function isLapsedSince(lastVisitAt: IsoDateTime | null, now: Date): boolean {
  return lastVisitAt !== null && daysBetween(new Date(lastVisitAt), now) > LAPSED_AFTER_DAYS
}

/** Lembrete de cliente sumido só vai para quem aceitou avisos (LGPD). */
export function isReachableForReminder(customer: ReminderTarget): boolean {
  return customer.isLapsed && customer.acceptsNotifications
}
