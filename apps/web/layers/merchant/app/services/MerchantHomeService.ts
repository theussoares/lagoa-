import type { HomeOverview } from '#shared/schemas/homeOverview'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface MerchantHomeService {
  /** Caderneta dos últimos 7 dias da loja, só em contagens. */
  getWeekSummary(): Promise<Result<WeekSummary, TransportError>>
  /** Resumo com comparação de períodos, oportunidades, clientes e atividade recente. */
  getOverview(): Promise<Result<HomeOverview, TransportError>>
}
