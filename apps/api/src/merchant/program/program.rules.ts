import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { Program, ProgramDraft, ProgramMode } from '#shared/schemas/program'

/**
 * Trava de modo: se houver cartões emitidos para a loja, o lojista não pode alterar
 * a modalidade (ex.: carimbos para pontos), pois isso quebraria os saldos existentes.
 * Alterar meta, prêmio ou bônus segue permitido a qualquer momento.
 */
export function canChangeProgramMode(
  activeCardsCount: number,
  currentMode: ProgramMode,
  targetMode: ProgramMode,
): boolean {
  if (currentMode === targetMode) {
    return true
  }
  return activeCardsCount <= 0
}

/**
 * Verifica se houve mudanças em regras críticas que demandam criação de nova versão
 * do programa na tabela `programs` (desativando a versão anterior para que novos cartões
 * recebam a nova versão enquanto cartões em andamento completam a versão em que nasceram).
 */
export function hasCriticalChanges(current: Program, draft: ProgramDraft): boolean {
  if (current.rules.mode !== draft.rules.mode) return true
  if (current.rules.target !== draft.rules.target) return true

  if (current.rules.mode === 'pointsPerVisit' && draft.rules.mode === 'pointsPerVisit') {
    if (current.rules.pointsPerVisit !== draft.rules.pointsPerVisit) return true
  }

  if (current.rules.mode === 'pointsPerCurrency' && draft.rules.mode === 'pointsPerCurrency') {
    if (current.rules.pointsPerReal !== draft.rules.pointsPerReal) return true
  }

  if (JSON.stringify(current.bonusRules) !== JSON.stringify(draft.bonusRules)) {
    return true
  }

  if (current.expirationPolicy.kind !== draft.expirationPolicy.kind) {
    return true
  }

  if (
    current.expirationPolicy.kind === 'afterInactivity' &&
    draft.expirationPolicy.kind === 'afterInactivity' &&
    current.expirationPolicy.months !== draft.expirationPolicy.months
  ) {
    return true
  }

  if (
    current.checkIn.enabled !== draft.checkIn.enabled ||
    current.checkIn.cooldownHours !== draft.checkIn.cooldownHours
  ) {
    return true
  }

  return false
}

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
