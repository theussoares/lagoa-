import { useSessionStore } from '#layers/core/app/stores/session'
import type { CustomerSession } from '#shared/schemas/session'
import type { CustomerSessionControl } from '../types/session'

export const SIGN_IN_PATH = '/entrar'
export const HOME_PATH = '/carteira'

export function useCustomerSession(): CustomerSessionControl {
  const sessions = useSessionStore()
  const auth = useAuthService()
  const { session } = useCustomerServices()

  async function signOut(): Promise<void> {
    await auth.signOut()
    sessions.endCustomer()
    await navigateTo(SIGN_IN_PATH, { replace: true })
  }

  async function restore(): Promise<CustomerSession | null> {
    if (sessions.checked) return sessions.customer
    const result = await session.restore()
    if (!result.ok) return null
    if (result.value === null) sessions.endCustomer()
    else sessions.startCustomer(result.value)
    return sessions.customer
  }

  return { session: computed(() => sessions.customer), start: sessions.startCustomer, restore, signOut }
}

/** Só caminhos internos: `?para=` nunca leva para fora do app. */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : HOME_PATH
}
