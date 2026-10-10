export default defineNuxtRouteMiddleware(() => {
  if (!useCampaignsEnabled()) return navigateTo(MERCHANT_PANEL_PATH, { replace: true })
})
