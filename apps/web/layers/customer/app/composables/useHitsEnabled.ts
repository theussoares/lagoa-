/**
 * Fase B do app do cliente (Hits, barra nova, menu Mais, Prêmios dentro da Carteira): desligada, o app segue
 * exatamente como antes. Liga com `NUXT_PUBLIC_HITS_ENABLED=true`.
 */
export function useHitsEnabled(): boolean {
  return useRuntimeConfig().public.hitsEnabled === true
}
