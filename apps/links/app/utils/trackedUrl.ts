const UTM_SOURCE = 'instagram'
const UTM_MEDIUM = 'bio'

/** Marca o clique para a métrica do destino separar o que veio do Instagram. */
export function withBioUtm(url: string, campaign: string): string {
  const tracked = new URL(url)
  tracked.searchParams.set('utm_source', UTM_SOURCE)
  tracked.searchParams.set('utm_medium', UTM_MEDIUM)
  tracked.searchParams.set('utm_campaign', campaign)
  return tracked.toString()
}
