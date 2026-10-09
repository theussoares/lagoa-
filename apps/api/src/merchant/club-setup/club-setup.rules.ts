import { CHECK_IN_CODE_LENGTH } from '#shared/constants/domain'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { CheckInCodeSchema, type CheckInCode } from '#shared/schemas/shop'
import { generateReadableCode } from '../../common/readable-code'

export function newCheckInCode(): CheckInCode {
  return CheckInCodeSchema.parse(generateReadableCode(CHECK_IN_CODE_LENGTH))
}

export function mapDraftToProgramInsert(shopId: string, draft: ClubSetupDraft['program']) {
  const rate = earnRateOf(draft.rules)
  return {
    shopId,
    active: true,
    rewardTitle: draft.reward.title,
    mode: draft.rules.mode,
    unit: unitOf(draft.rules),
    earnPer: rate.per,
    earnUnits: rate.units,
    target: draft.rules.target,
    bonusRules: draft.bonusRules,
    expirationKind: draft.expirationPolicy.kind,
    expirationMonths: draft.expirationPolicy.kind === 'afterInactivity' ? draft.expirationPolicy.months : null,
    checkInEnabled: draft.checkIn.enabled,
    checkInCooldownHours: draft.checkIn.cooldownHours,
  }
}
