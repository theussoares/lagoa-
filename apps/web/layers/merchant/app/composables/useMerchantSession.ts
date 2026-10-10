import { useMerchantSessionStore } from '../stores/merchantSession'
import { useClubSetupStore } from '../stores/clubSetup'
import type { MerchantAccess, MerchantSessionControl } from '../types/session'

export const MERCHANT_SIGN_IN_PATH = '/balcao/entrar'
export const MERCHANT_HOME_PATH = '/balcao'
export const CLUB_SETUP_PATH = '/balcao/criar-clube'
export const MERCHANT_PANEL_PATH = '/painel'

export function useMerchantSession(): MerchantSessionControl {
  const sessions = useMerchantSessionStore()
  const clubSetup = useClubSetupStore()

  function accessNow(): MerchantAccess {
    if (sessions.merchant !== null) return { status: 'shop', session: sessions.merchant }
    return { status: sessions.withoutShop ? 'noShop' : 'signedOut' }
  }

  async function check(): Promise<MerchantAccess> {
    if (sessions.checked) return accessNow()
    const result = await useMerchantAuthService().currentSession()
    if (result.ok) sessions.startMerchant(result.value)
    else if (result.error.code === 'notFound') sessions.startWithoutShop()
    else if (result.error.code === 'unauthorized') sessions.endMerchant()
    else return { status: 'signedOut' } // falha de rede: não marca como checado, a próxima navegação tenta de novo
    return accessNow()
  }

  async function signOut(): Promise<void> {
    await useMerchantAuthService().signOut()
    sessions.endMerchant()
    clubSetup.finish()
    await navigateTo(MERCHANT_SIGN_IN_PATH, { replace: true })
  }

  return { session: computed(() => sessions.merchant), start: sessions.startMerchant, startWithoutShop: sessions.startWithoutShop, check, signOut }
}

/** Só caminhos internos do painel: `?para=` nunca leva para fora nem para o app do cliente. */
export function safeMerchantReturnPath(value: unknown, fallback: string = MERCHANT_HOME_PATH): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
