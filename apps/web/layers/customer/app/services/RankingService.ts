import type { Ranking, RankingConsentUpdate } from '#shared/schemas/ranking'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface RankingService {
  getRanking(): Promise<Result<Ranking, TransportError>>
  /** Entrar exige apelido; sair apaga o apelido. Devolve o ranking já atualizado. */
  setConsent(update: RankingConsentUpdate): Promise<Result<Ranking, TransportError>>
}
