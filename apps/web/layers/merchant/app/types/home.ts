import type { CampaignOverview } from '#shared/schemas/campaign'
import type { MerchantCustomerPage } from '#shared/schemas/customer'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ComputedRef } from 'vue'
import type { CheckInPosterModel } from './poster'
export interface HomeStatCard {
  readonly id: 'sales' | 'visits' | 'redemptions' | 'lapsed'
  /** "Vendas da semana". */
  readonly label: string
  /** Já formatado: "R$ 120,50" ou "3". */
  readonly value: string
  /** "2 clientes" embaixo do número; `null` quando não há nota. */
  readonly note: string | null
}

export interface HomeStatInput {
  readonly week: WeekSummary
  readonly lapsedTotal: number
  readonly reachable: number | null
}

export interface LapsedPreviewLabels {
  readonly caption: string
  readonly noName: string
}

export interface MerchantHomeSnapshot {
  readonly week: WeekSummary
  /** Primeira página dos sumidos, mais recentes primeiro (os mais fáceis de trazer de volta); `total` conta todos. */
  readonly lapsed: MerchantCustomerPage
  /** Todos os clientes cadastrados da loja (mais recentes primeiro). */
  readonly allCustomers: MerchantCustomerPage | null
  /** Clientes prontos para resgate. */
  readonly readyCustomers: MerchantCustomerPage | null
  /** Programa e prêmio cadastrados da loja. */
  readonly program: Program | null
  /** Campanhas cadastradas. */
  readonly campaignsOverview: CampaignOverview | null
  /**
   * Quantos podem receber um lembrete agora (regra do servidor, a mesma de Campanhas).
   * `null` quando a contagem não veio: o resto do Início continua de pé.
   */
  readonly reachable: number | null
  /** O cartaz antigo ainda está na parede. Sem a resposta, o aviso não aparece. */
  readonly posterReprintPending: boolean
}

export interface PosterReprint {
  /** Cartaz novo, só montado durante a impressão. */
  readonly poster: CheckInPosterModel | null
  readonly printing: boolean
  print: () => Promise<void>
}

export interface MerchantHome {
  state: ComputedRef<AsyncResultState<MerchantHomeSnapshot, TransportError>>
  reload: () => Promise<void>
  posterReprint: PosterReprint
}
