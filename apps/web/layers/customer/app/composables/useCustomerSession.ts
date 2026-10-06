import { useSessionStore } from '#layers/core/app/stores/session'
import type { RouteLocationNormalized } from 'vue-router'
import { VISIT_QR_LINK_PARAM } from '#shared/constants/domain'
import type { CustomerSession } from '#shared/schemas/session'
import { CHECK_IN_PATH, readVisitFragment } from '#shared/utils/checkInCode'
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

/**
 * Para onde voltar depois do login: o `?para=` mais, só se for fragmento de visita válido e o destino for o
 * check-in, o `#visita=` (o QR da visita sobrevive ao cadastro por SMS). Qualquer outro fragmento é descartado.
 */
export function returnLocation(para: unknown, hash: string): string {
  const [path = HOME_PATH] = safeReturnPath(para).split('#')
  const token = readVisitFragment(hash)
  if (token === null || new URL(path, 'https://app.invalid').pathname !== CHECK_IN_PATH) return path
  return `${path}#${VISIT_QR_LINK_PARAM}=${token}`
}

/**
 * Redirect para o login. O `?para=` leva caminho e query, nunca o fragmento (o token da visita não pode
 * ficar na URL do login); o fragmento de visita válido segue em `hash`. No servidor ele nem chega: o
 * navegador reaplica o fragmento sozinho no redirect.
 */
export function signInLocation(to: Pick<RouteLocationNormalized, 'fullPath' | 'hash'>): { path: string; query: { para?: string }; hash?: string } {
  const [para = HOME_PATH] = to.fullPath.split('#')
  const token = readVisitFragment(to.hash)
  return {
    path: SIGN_IN_PATH,
    query: para === HOME_PATH ? {} : { para },
    ...(token === null ? {} : { hash: `#${VISIT_QR_LINK_PARAM}=${token}` }),
  }
}
