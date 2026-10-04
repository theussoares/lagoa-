import { birthdayChangeableAt } from '#shared/domain/birthday'
import type { ProfileUpdate } from '#shared/schemas/customer'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import type { ProfilePatch, ProfileRecord } from './profile.repository'

type BirthdayLocked = ErrorOf<'birthdayLocked'>

/**
 * Primeira data é livre; depois a troca trava por 365 dias (senão viraria dobro todo dia).
 * Tirar a data vale a qualquer hora, mas não destrava a próxima troca.
 */
export function decideProfileUpdate(
  current: ProfileRecord,
  update: ProfileUpdate,
  now: Date,
): Result<ProfilePatch, BirthdayLocked> {
  const settingNewDate = update.birthday !== null && update.birthday !== current.birthday
  const lockedUntil = birthdayChangeableAt(current.birthdayChangedAt, now)
  if (settingNewDate && lockedUntil !== null) {
    return err({ code: 'birthdayLocked', changeableAt: toIso(lockedUntil) })
  }
  return ok({
    firstName: update.firstName,
    birthday: update.birthday,
    ...(settingNewDate && { birthdayChangedAt: now }),
  })
}

export function decideConsent(granted: boolean, now: Date): Result<ProfilePatch, never> {
  return ok({ notificationsConsent: granted, consentUpdatedAt: now })
}

/** Idempotente: o primeiro aceite é o que vale. */
export function decideTerms(current: ProfileRecord, now: Date, version: string): Result<ProfilePatch, never> {
  return ok(current.termsAcceptedAt === null ? { termsAcceptedAt: now, termsVersion: version } : {})
}
