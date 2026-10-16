const UTM_SOURCE = 'instagram'
const UTM_MEDIUM = 'bio'
/** Base só para o `URL` aceitar caminho relativo; não aparece no resultado. */
const RELATIVE_BASE = 'https://relative.invalid'

/** Marca o clique para a métrica do destino separar o que veio do Instagram. Caminho relativo continua relativo. */
export function withBioUtm(url: string, campaign: string): string {
  const tracked = new URL(url, RELATIVE_BASE)
  tracked.searchParams.set('utm_source', UTM_SOURCE)
  tracked.searchParams.set('utm_medium', UTM_MEDIUM)
  tracked.searchParams.set('utm_campaign', campaign)
  return tracked.origin === RELATIVE_BASE ? `${tracked.pathname}${tracked.search}` : tracked.toString()
}
