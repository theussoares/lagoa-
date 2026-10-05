import { useMerchantSessionStore } from '../stores/merchantSession'

export default defineNuxtRouteMiddleware((to) => {
  if (useMerchantSessionStore().merchant === null) return
  return navigateTo(safeMerchantReturnPath(to.query.para))
})
