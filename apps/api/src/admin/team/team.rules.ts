import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'

export type AdminStatusAction = 'disable' | 'reactivate'

/** Ninguém desativa, reativa ou zera o MFA de si mesmo: sempre outro admin (e a rede nunca fica sem nenhum ativo). */
export function refuseSelf(actorAdminId: string, targetAdminId: string): Result<void, ErrorOf<'forbidden'>> {
  return actorAdminId === targetAdminId ? err({ code: 'forbidden' }) : ok(undefined)
}

/** Desativar só quem está ativo; reativar só quem está desativado. A data da desativação é a de agora. */
export function planStatusChange(
  action: AdminStatusAction,
  current: { readonly disabledAt: Date | null },
  now: Date,
): Result<{ readonly disabledAt: Date | null }, ErrorOf<'invalidTransition'>> {
  const isActive = current.disabledAt === null
  if (action === 'disable') return isActive ? ok({ disabledAt: now }) : err({ code: 'invalidTransition' })
  return isActive ? err({ code: 'invalidTransition' }) : ok({ disabledAt: null })
}
