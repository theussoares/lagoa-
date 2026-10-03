import type { MerchantCustomerRow } from '#shared/schemas/customer'
import { isRewardReady } from '#shared/domain/loyaltyCard'
import { calendarDaysBetween } from '#shared/utils/time'
import type { Translate } from '#layers/core/app/utils/translate'
import type { CustomerRowModel } from '#layers/ui/app/types/customers'

function lastVisitText(lastVisitAt: string | null, now: Date, t: Translate): string {
  if (lastVisitAt === null) return t('customers.lastVisit.never')
  const days = calendarDaysBetween(new Date(lastVisitAt), now)
  return days === 0 ? t('customers.lastVisit.today') : t('customers.lastVisit.daysAgo', { count: days }, days)
}

export function toCustomerRowModel(row: MerchantCustomerRow, now: Date, t: Translate): CustomerRowModel {
  return {
    id: row.customerId,
    name: row.firstName,
    phone: row.maskedPhone,
    progress: t('customers.progress', { balance: row.balance, target: row.target, units: t(`units.${row.unit}Noun`, {}, row.target) }),
    progressRatio: Math.min(1, row.balance / row.target),
    rewardReady: isRewardReady(row),
    visits: String(row.visitsCount),
    lastVisit: lastVisitText(row.lastVisitAt, now, t),
    isLapsed: row.isLapsed,
    acceptsNotifications: row.acceptsNotifications,
  }
}
