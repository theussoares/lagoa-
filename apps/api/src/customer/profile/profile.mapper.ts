import { birthdayChangeableAt } from '#shared/domain/birthday'
import { CustomerIdSchema } from '#shared/schemas/ids'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { CustomerProfile } from '#shared/schemas/customer'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import type { ProfileRecord } from './profile.repository'

const isoOrNull = (date: Date | null): string | null => (date === null ? null : toIso(date))

/** O celular só sai daqui mascarado; o claro existe apenas dentro desta função. */
export function toCustomerProfile(record: ProfileRecord, phone: string, now: Date): CustomerProfile {
  return {
    id: CustomerIdSchema.parse(record.userId),
    firstName: record.firstName,
    birthday: record.birthday,
    birthdayChangeableAt: isoOrNull(birthdayChangeableAt(record.birthdayChangedAt, now)),
    maskedPhone: maskPhone(PhoneNumberSchema.parse(phone)),
    consent: { notifications: record.notificationsConsent, updatedAt: isoOrNull(record.consentUpdatedAt) },
    termsAcceptedAt: isoOrNull(record.termsAcceptedAt),
  }
}
