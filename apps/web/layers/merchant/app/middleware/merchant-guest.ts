import { useSessionStore } from '#layers/core/app/stores/session'

export default defineNuxtRouteMiddleware((to) => {
  if (useSessionStore().merchant === null) return
  return navigateTo(safeMerchantReturnPath(to.query.para))
})
