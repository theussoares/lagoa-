import { useSessionStore } from '#layers/core/app/stores/session'

export default defineNuxtRouteMiddleware((to) => {
  if (useSessionStore().merchant !== null) return
  return navigateTo({ path: MERCHANT_SIGN_IN_PATH, query: to.fullPath === MERCHANT_HOME_PATH ? {} : { para: to.fullPath } })
})
