/**
 * Campanhas ainda não têm API (M5): no `http` ficam escondidas, a menos que `NUXT_PUBLIC_CAMPAIGNS_ENABLED=true`.
 * O mock do navegador já responde campanhas, então lá a tela segue aberta.
 */
export function useCampaignsEnabled(): boolean {
  const config = useRuntimeConfig().public
  return config.campaignsEnabled === true || config.merchantBackend === 'mock'
}
