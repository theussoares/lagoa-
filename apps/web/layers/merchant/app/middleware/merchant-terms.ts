/** Sem o aceite da versão atual do termo, o Balcão manda para o Início, onde o termo é mostrado e aceito. */
export default defineNuxtRouteMiddleware(async () => {
  const access = await useMerchantSession().check()
  if (access.status === 'shop' && !access.session.termsAccepted) return navigateTo(MERCHANT_PANEL_PATH, { replace: true })
})
