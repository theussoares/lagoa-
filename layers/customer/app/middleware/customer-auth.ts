import { useSessionStore } from '#layers/core/app/stores/session'

export default defineNuxtRouteMiddleware((to) => {
  if (useSessionStore().customer !== null) return
  return navigateTo({ path: SIGN_IN_PATH, query: to.fullPath === HOME_PATH ? {} : { para: to.fullPath } })
})
