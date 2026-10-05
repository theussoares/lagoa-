export default defineNuxtRouteMiddleware(async (to) => {
  if ((await useCustomerSession().restore()) !== null) return
  return navigateTo({ path: SIGN_IN_PATH, query: to.fullPath === HOME_PATH ? {} : { para: to.fullPath } })
})
