import { useSessionStore } from '#layers/core/app/stores/session'

export default defineNuxtRouteMiddleware((to) => {
  if (useSessionStore().customer === null) return
  return navigateTo(safeReturnPath(to.query.para))
})
