import { useMerchantSessionStore } from '../stores/merchantSession'
import { useClubSetupStore } from '../stores/clubSetup'
import { useSessionStore } from '#layers/core/app/stores/session'
import type { MerchantSession } from '#shared/schemas/session'
import type { MerchantAccess, MerchantSessionControl } from '../types/session'

export const MERCHANT_SIGN_IN_PATH = '/balcao/entrar'
export const MERCHANT_HOME_PATH = '/balcao'
export const CLUB_SETUP_PATH = '/balcao/criar-clube'
export const MERCHANT_PANEL_PATH = '/painel'

export function useMerchantSession(): MerchantSessionControl {
  const sessions = useMerchantSessionStore()
  const clubSetup = useClubSetupStore()
  const customerSessions = useSessionStore()

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

  /** Esquece a sessão só aqui e vai para o login: para quando o servidor já disse que ela não vale (`unauthorized`). */
  async function expire(): Promise<void> {
    sessions.endMerchant()
    clubSetup.finish()
    customerSessions.resetCustomer()
    await navigateTo(MERCHANT_SIGN_IN_PATH, { replace: true })
  }

  /** Sair de verdade: só deixa o painel depois que o servidor confirma, senão o cookie ainda vale e o balcão reabriria. */
  async function signOut(): Promise<void> {
    const result = await useMerchantAuthService().signOut()
    if (!result.ok) {
      // `$i18n` (e não `useI18n`): este composable também roda nos middlewares, fora de um `setup`.
      useToast().add({ title: useNuxtApp().$i18n.t('merchantNav.signOutFailed'), color: 'error' })
      return
    }
    await expire()
  }

  function start(session: MerchantSession): void {
    customerSessions.resetCustomer()
    sessions.startMerchant(session)
  }

  function startWithoutShop(): void {
    customerSessions.resetCustomer()
    sessions.startWithoutShop()
  }

  return { session: computed(() => sessions.merchant), start, startWithoutShop, check, signOut, expire }
}

/** Só caminhos internos do painel: `?para=` nunca leva para fora nem para o app do cliente. */
export function safeMerchantReturnPath(value: unknown, fallback: string = MERCHANT_HOME_PATH): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
