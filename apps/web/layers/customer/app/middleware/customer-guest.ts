export default defineNuxtRouteMiddleware(async (to) => {
  if ((await useCustomerSession().restore()) === null) return
  return navigateTo(returnLocation(to.query.para, to.hash))
})
