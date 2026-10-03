import { useSessionStore } from '#layers/core/app/stores/session'
import { useClubSetupStore } from '../stores/clubSetup'

/** Criar o clube só com o celular recém-confirmado e dentro do prazo; quem já tem loja vai para o Início. */
export default defineNuxtRouteMiddleware(() => {
  if (useClubSetupStore().hasValidTicket(new Date())) return
  return navigateTo(useSessionStore().merchant === null ? MERCHANT_SIGN_IN_PATH : MERCHANT_PANEL_PATH, { replace: true })
})
