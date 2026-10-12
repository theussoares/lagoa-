/**
 * O painel `mock` (navegador, `localStorage`, código fixo) é só para `pnpm dev`, testes e demonstração offline. Num
 * build de produção ele mostraria um painel falso com um código de entrada público: o servidor nem sobe.
 */
export function assertMerchantBackendAllowed(backend: unknown, production: boolean): void {
  if (production && backend === 'mock') {
    throw new Error('NUXT_PUBLIC_MERCHANT_BACKEND=mock is not allowed in a production build')
  }
}
