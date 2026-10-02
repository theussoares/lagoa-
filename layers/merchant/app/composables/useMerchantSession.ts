import { useSessionStore } from '#layers/core/app/stores/session'
import type { MerchantSession } from '#shared/schemas/session'

export const MERCHANT_SIGN_IN_PATH = '/balcao/entrar'
export const MERCHANT_HOME_PATH = '/balcao'

export function useMerchantSession(): {
  session: ComputedRef<MerchantSession | null>
  start: (session: MerchantSession) => void
  signOut: () => Promise<void>
} {
  const sessions = useSessionStore()

  async function signOut(): Promise<void> {
    sessions.endMerchant()
    await navigateTo(MERCHANT_SIGN_IN_PATH, { replace: true })
  }

  return { session: computed(() => sessions.merchant), start: sessions.startMerchant, signOut }
}

/** Só caminhos internos do painel: `?para=` nunca leva para fora nem para o app do cliente. */
export function safeMerchantReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return MERCHANT_HOME_PATH
  return value
}
