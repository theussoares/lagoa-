import { REMINDER_BONUS_MIN_UNITS } from '#shared/constants/domain'
import { isBonusWithinLimits } from '#shared/domain/campaign'
import { ReminderDraftSchema } from '#shared/schemas/campaign'
import type { ReminderBonusLimits, ReminderDraft } from '#shared/schemas/campaign'
import type { ReminderField, ReminderFieldErrors } from '../types/campaign'

function isReminderField(value: unknown): value is ReminderField {
  return value === 'message' || value === 'bonusUnits'
}

/** O presente sugerido depende do programa; entra quando o alcance carrega (`withSuggestedBonus`). */
export function initialReminderDraft(message: string): ReminderDraft {
  return { message, bonusUnits: REMINDER_BONUS_MIN_UNITS }
}

export function withSuggestedBonus(draft: ReminderDraft, limits: ReminderBonusLimits): ReminderDraft {
  return { ...draft, bonusUnits: limits.suggested }
}

export function reminderFieldErrors(draft: ReminderDraft, limits: ReminderBonusLimits): ReminderFieldErrors {
  const errors: ReminderFieldErrors = {}
  const parsed = ReminderDraftSchema.safeParse(draft)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [field] = issue.path
      if (isReminderField(field)) errors[field] = true
    }
  }
  if (!isBonusWithinLimits(draft.bonusUnits, limits)) errors.bonusUnits = true
  return errors
}
