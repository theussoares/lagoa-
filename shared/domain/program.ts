import type { Program, ProgramDraft } from '../schemas/program'

/**
 * Compara a versão ativa com o rascunho. Mudança de regra que afeta quanto o cliente ganha (ou quando vence)
 * não é "a mesma versão": quem decide criar versão nova é o servidor, e o mock usa esta mesma função.
 * O título do prêmio fica de fora: trocá-lo não muda o que já está em cartão.
 */
export function isSameProgram(current: Program, draft: ProgramDraft): boolean {
  if (current.rules.mode !== draft.rules.mode) return false
  if (current.rules.target !== draft.rules.target) return false

  if (current.rules.mode === 'pointsPerVisit' && draft.rules.mode === 'pointsPerVisit') {
    if (current.rules.pointsPerVisit !== draft.rules.pointsPerVisit) return false
  }

  if (current.rules.mode === 'pointsPerCurrency' && draft.rules.mode === 'pointsPerCurrency') {
    if (current.rules.pointsPerReal !== draft.rules.pointsPerReal) return false
  }

  if (JSON.stringify(current.bonusRules) !== JSON.stringify(draft.bonusRules)) return false

  if (current.expirationPolicy.kind !== draft.expirationPolicy.kind) return false

  if (
    current.expirationPolicy.kind === 'afterInactivity' &&
    draft.expirationPolicy.kind === 'afterInactivity' &&
    current.expirationPolicy.months !== draft.expirationPolicy.months
  ) {
    return false
  }

  if (
    current.checkIn.enabled !== draft.checkIn.enabled ||
    current.checkIn.cooldownHours !== draft.checkIn.cooldownHours ||
    current.checkIn.cooldownMode !== draft.checkIn.cooldownMode
  ) {
    return false
  }

  return true
}
