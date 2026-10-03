import { useSessionStore } from '#layers/core/app/stores/session'
import { useClubSetupStore } from '../stores/clubSetup'
import type { MerchantSessionControl } from '../types/session'

export const MERCHANT_SIGN_IN_PATH = '/balcao/entrar'
export const MERCHANT_HOME_PATH = '/balcao'
export const CLUB_SETUP_PATH = '/balcao/criar-clube'
export const MERCHANT_PANEL_PATH = '/painel'

export function useMerchantSession(): MerchantSessionControl {
  const sessions = useSessionStore()
  const clubSetup = useClubSetupStore()

  async function signOut(): Promise<void> {
    sessions.endMerchant()
    clubSetup.finish()
    await navigateTo(MERCHANT_SIGN_IN_PATH, { replace: true })
  }

  return { session: computed(() => sessions.merchant), start: sessions.startMerchant, signOut }
}

/** Só caminhos internos do painel: `?para=` nunca leva para fora nem para o app do cliente. */
export function safeMerchantReturnPath(value: unknown, fallback: string = MERCHANT_HOME_PATH): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
