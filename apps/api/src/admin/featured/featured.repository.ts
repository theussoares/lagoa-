import type { FeaturedSurface } from '#shared/schemas/featured'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { PlacementError, PlacementPeriod, PlacementTarget } from '../../featured/featured.rules'

export interface AdminPlacementRecord {
  readonly id: string
  readonly surface: FeaturedSurface
  readonly shop: { readonly id: string; readonly name: string }
  readonly hitItem: { readonly id: string; readonly title: string } | null
  readonly startsAt: Date
  readonly endsAt: Date
  readonly note: string | null
  readonly createdByName: string
  readonly createdAt: Date
  readonly cancelledAt: Date | null
  readonly cancelledByName: string | null
}

/** Instantes UTC `[from, to)`: o service já converteu os dias locais. */
export interface PlacementWindow {
  readonly surface: FeaturedSurface
  readonly from: Date
  readonly to: Date
}

export interface PlacementCandidate {
  readonly shopId: string
  readonly surface: FeaturedSurface
  readonly hitItemId: string | null
  readonly startsAt: Date
  readonly endsAt: Date
  readonly note: string | null
}

/** O que a regra precisa, lido dentro da transação e depois do lock da vitrine. */
export type PlacementSnapshot = Pick<PlacementTarget, 'shopStatus' | 'hitItem' | 'existing'>

export type CreatePlacementError = PlacementError | ErrorOf<'notFound'>
export type CancelPlacementError = ErrorOf<'notFound' | 'invalidTransition'>

export abstract class AdminFeaturedRepository {
  /** Destaques (cancelados inclusive) que tocam a janela, `starts_at` e `id` em ordem; no máximo `limit`. */
  abstract list(window: PlacementWindow, limit: number): Promise<readonly AdminPlacementRecord[]>
  /** Lojas aprovadas no plano Pro (já ficam no carrossel sem linha), por nome; no máximo `limit`. */
  abstract listProShops(limit: number): Promise<readonly { readonly id: string; readonly name: string }[]>
  /** Períodos não cancelados da vitrine que tocam a janela (loja suspensa continua ocupando a vaga). */
  abstract activePeriods(window: PlacementWindow): Promise<readonly PlacementPeriod[]>
  /**
   * Numa transação: trava a vitrine (`pg_advisory_xact_lock`) antes de ler os vigentes, lê loja e produto, deixa `decide`
   * aprovar e grava. Loja inexistente é `notFound`; produto inexistente chega a `decide` como `null`.
   */
  abstract create(
    candidate: PlacementCandidate,
    adminId: string,
    decide: (snapshot: PlacementSnapshot) => Result<void, PlacementError>,
  ): Promise<Result<AdminPlacementRecord, CreatePlacementError>>
  /** Marca `cancelled_at` e quem cancelou; já cancelado é `invalidTransition`. */
  abstract cancel(id: string, adminId: string): Promise<Result<AdminPlacementRecord, CancelPlacementError>>
}
