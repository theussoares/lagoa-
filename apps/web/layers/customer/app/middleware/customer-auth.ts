export default defineNuxtRouteMiddleware(async (to) => {
  if ((await useCustomerSession().restore()) !== null) return
  return navigateTo(signInLocation(to))
})
