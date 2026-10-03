import type { DomainErrorCode } from '#shared/types/errors'
import type { ErrorCarrier } from '../types/error'

/** Código do erro do estado, ou `null` se o estado não está em erro. */
export function errorCodeOf(state: ErrorCarrier): DomainErrorCode | null {
  if (state.status !== 'error') return null
  return state.error?.code ?? state.code ?? null
}

/** Algum dos estados está em erro com um dos códigos? */
export function hasErrorCode(states: readonly ErrorCarrier[], codes: readonly DomainErrorCode[]): boolean {
  return states.some((state) => {
    const code = errorCodeOf(state)
    return code !== null && codes.includes(code)
  })
}
