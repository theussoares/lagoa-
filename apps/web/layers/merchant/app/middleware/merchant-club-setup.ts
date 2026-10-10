/** Criar o clube só com o celular já confirmado e ainda sem loja; quem já tem loja vai para o Início. */
export default defineNuxtRouteMiddleware(async () => {
  const access = await useMerchantSession().check()
  if (access.status === 'noShop') return
  return navigateTo(access.status === 'shop' ? MERCHANT_PANEL_PATH : MERCHANT_SIGN_IN_PATH, { replace: true })
})
