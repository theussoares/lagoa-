import { useSessionStore } from '#layers/core/app/stores/session'
import type { CustomerSessionControl } from '../types/session'

export const SIGN_IN_PATH = '/entrar'
export const HOME_PATH = '/carteira'

export function useCustomerSession(): CustomerSessionControl {
  const sessions = useSessionStore()

  async function signOut(): Promise<void> {
    sessions.endCustomer()
    await navigateTo(SIGN_IN_PATH, { replace: true })
  }

  return { session: computed(() => sessions.customer), start: sessions.startCustomer, signOut }
}

/** Só caminhos internos: `?para=` nunca leva para fora do app. */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : HOME_PATH
}
