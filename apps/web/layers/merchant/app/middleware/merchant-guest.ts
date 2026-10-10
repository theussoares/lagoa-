export default defineNuxtRouteMiddleware(async (to) => {
  if ((await useMerchantSession().check()).status !== 'shop') return
  return navigateTo(safeMerchantReturnPath(to.query.para))
})
