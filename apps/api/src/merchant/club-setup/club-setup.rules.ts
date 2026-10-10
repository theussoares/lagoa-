import { CHECK_IN_CODE_LENGTH } from '#shared/constants/domain'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import { CheckInCodeSchema, type CheckInCode } from '#shared/schemas/shop'
import { generateReadableCode } from '../../common/readable-code'

export function newCheckInCode(): CheckInCode {
  return CheckInCodeSchema.parse(generateReadableCode(CHECK_IN_CODE_LENGTH))
}

/** A linha do programa sai de uma função só (a do `PUT /program`): criar o clube e trocar as regras não divergem. */
export { mapDraftToProgramInsert } from '../program/program.rules'
