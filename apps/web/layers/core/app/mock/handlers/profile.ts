import type { CustomerProfile, ProfileUpdate } from '#shared/schemas/customer'
import type { CustomerId } from '#shared/schemas/ids'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { maskPhone } from '#shared/utils/phone'
import { birthdayChangeableAt as changeableAtFrom } from '#shared/domain/birthday'
import { toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import type { CustomerRecord } from '../state'

type Unauthorized = ErrorOf<'unauthorized'>

function birthdayChangeableAt(customer: CustomerRecord, now: Date): Date | null {
  const changedAt = customer.birthdayChangedAt === null ? null : new Date(customer.birthdayChangedAt)
  return changeableAtFrom(changedAt, now)
}

function toProfile(customer: CustomerRecord, now: Date): CustomerProfile {
  const changeableAt = birthdayChangeableAt(customer, now)
  return {
    id: customer.id,
    firstName: customer.firstName,
    birthday: customer.birthday,
    birthdayChangeableAt: changeableAt === null ? null : toIso(changeableAt),
    maskedPhone: maskPhone(customer.phone),
    consent: customer.consent,
    termsAcceptedAt: customer.termsAcceptedAt,
  }
}

function updateCustomer(
  ctx: MockContext,
  customerId: CustomerId,
  change: (customer: CustomerRecord) => CustomerRecord,
): Result<CustomerProfile, Unauthorized> {
  const index = ctx.state.customers.findIndex((customer) => customer.id === customerId)
  const current = ctx.state.customers[index]
  if (current === undefined) return err({ code: 'unauthorized' })
  const next = change(current)
  ctx.state.customers[index] = next
  return ok(toProfile(next, ctx.now))
}

export function getProfile(ctx: MockContext, customerId: CustomerId): Result<CustomerProfile, Unauthorized> {
  return updateCustomer(ctx, customerId, (customer) => customer)
}

export function updateProfile(
  ctx: MockContext,
  customerId: CustomerId,
  update: ProfileUpdate,
): Result<CustomerProfile, Unauthorized | ErrorOf<'birthdayLocked'>> {
  const current = ctx.state.customers.find((customer) => customer.id === customerId)
  if (current === undefined) return err({ code: 'unauthorized' })
  const settingNewDate = update.birthday !== null && update.birthday !== current.birthday
  const changeableAt = birthdayChangeableAt(current, ctx.now)
  if (settingNewDate && changeableAt !== null) return err({ code: 'birthdayLocked', changeableAt: toIso(changeableAt) })
  return updateCustomer(ctx, customerId, (customer) => ({
    ...customer,
    ...update,
    birthdayChangedAt: settingNewDate ? toIso(ctx.now) : customer.birthdayChangedAt,
  }))
}

export function setNotificationConsent(
  ctx: MockContext,
  customerId: CustomerId,
  granted: boolean,
): Result<CustomerProfile, Unauthorized> {
  return updateCustomer(ctx, customerId, (customer) => ({
    ...customer,
    consent: { notifications: granted, updatedAt: toIso(ctx.now) },
  }))
}

export function acceptTerms(ctx: MockContext, customerId: CustomerId): Result<CustomerProfile, Unauthorized> {
  return updateCustomer(ctx, customerId, (customer) => ({
    ...customer,
    termsAcceptedAt: customer.termsAcceptedAt ?? toIso(ctx.now),
  }))
}
