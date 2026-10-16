import { track } from '@vercel/analytics'
import type { BioLinkItem } from '../types/bioLink'

interface BioTracking {
  readonly trackClick: (link: BioLinkItem) => void
}

/** Clique de cada link da bio, no mesmo Vercel Analytics que já conta a visita. Falha de rede nunca atrapalha a navegação. */
export function useBioTracking(): BioTracking {
  function trackClick(link: BioLinkItem): void {
    try {
      track('bio_link_click', { link: link.id })
    } catch {
      // métrica é opcional
    }
  }
  return { trackClick }
}
