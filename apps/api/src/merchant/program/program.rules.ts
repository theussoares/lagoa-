import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ProgramDraft } from '#shared/schemas/program'

/**
 * Mapeia o draft do programa para os valores de inserção na tabela `programs`.
 */
export function mapDraftToProgramInsert(shopId: string, draft: ProgramDraft) {
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
