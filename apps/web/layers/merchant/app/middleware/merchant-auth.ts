export default defineNuxtRouteMiddleware(async (to) => {
  if ((await useMerchantSession().check()).status === 'shop') return
  return navigateTo({ path: MERCHANT_SIGN_IN_PATH, query: to.fullPath === MERCHANT_HOME_PATH ? {} : { para: to.fullPath } })
})
