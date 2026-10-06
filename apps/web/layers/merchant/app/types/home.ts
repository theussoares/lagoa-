import type { MerchantCustomerRow } from '#shared/schemas/customer'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ComputedRef } from 'vue'
import type { CheckInPosterModel } from './poster'

export interface WeekDayRow {
  readonly isoDate: string
  readonly label: string
  readonly isToday: boolean
  /** "3 visitas". */
  readonly visits: string
  /** Visitas do dia, desenhadas como risquinhos de caderneta. */
  readonly count: number
  /** "1 cliente novo · 1 prêmio entregue"; `null` sem nada além de visitas. */
  readonly detail: string | null
}

export interface LapsedPreviewLabels {
  readonly caption: string
  readonly noName: string
}

export interface MerchantHomeSnapshot {
  readonly week: WeekSummary
  /** Sumidos mais recentes primeiro: são os mais fáceis de trazer de volta. */
  readonly lapsed: readonly MerchantCustomerRow[]
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
