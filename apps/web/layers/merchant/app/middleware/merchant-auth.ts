import { useMerchantSessionStore } from '../stores/merchantSession'

export default defineNuxtRouteMiddleware((to) => {
  if (useMerchantSessionStore().merchant !== null) return
  return navigateTo({ path: MERCHANT_SIGN_IN_PATH, query: to.fullPath === MERCHANT_HOME_PATH ? {} : { para: to.fullPath } })
})
