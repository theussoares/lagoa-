import type { MerchantCustomerRow } from '../schemas/customer'

type ReminderTarget = Pick<MerchantCustomerRow, 'isLapsed' | 'acceptsNotifications'>

/** Lembrete de cliente sumido só vai para quem aceitou avisos (LGPD). */
export function isReachableForReminder(customer: ReminderTarget): boolean {
  return customer.isLapsed && customer.acceptsNotifications
}
