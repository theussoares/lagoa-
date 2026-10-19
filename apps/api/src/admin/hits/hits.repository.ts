import type { AdminHitItemTab } from '#shared/schemas/admin'
import type { HitItemStatus } from '#shared/schemas/hitItem'
import type { ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { ShopContactColumns } from '../../shops/shop-contact-columns'

export interface AdminHitItemRecord {
  readonly id: string
  readonly version: number
  readonly title: string
  readonly description: string | null
  readonly priceCents: number | null
  readonly endsAt: Date | null
  readonly status: HitItemStatus
  readonly rejectionReason: string | null
  readonly photoPath: string | null
  readonly createdAt: Date
  readonly approvedAt: Date | null
  /** Botão próprio do produto; tudo `null` = usa o da loja. */
  readonly itemContact: ShopContactColumns
  readonly shop: {
    readonly id: string
    readonly name: string
    readonly status: ShopStatus
    readonly contact: ShopContactColumns
  }
}

export interface AdminHitItemListFilter {
  readonly tab: AdminHitItemTab
  /** Id do último produto da página anterior. */
  readonly after: string | null
  readonly limit: number
  /** Só para testes: restringe a uma loja. */
  readonly shopId?: string
}

export interface HitItemSnapshot {
  readonly status: HitItemStatus
  readonly version: number
  readonly photoPath: string | null
}

export interface HitItemDecision {
  readonly to: HitItemStatus
  readonly reason: string | null
}

export type ReviewError = ErrorOf<'notFound' | 'conflict' | 'invalidTransition'>

export abstract class AdminHitsRepository {
  /** `pending`: só com foto, `created_at asc`. `approved`: `approved_at desc nulls last`. `id` desempata. Pede `limit` linhas. */
  abstract list(filter: AdminHitItemListFilter): Promise<readonly AdminHitItemRecord[]>
  /**
   * Trava só a linha do item (`FOR UPDATE`; nunca a loja, que o lojista trava antes do item), deixa `decide` escolher
   * o destino e grava status, `approved_at` (ao aprovar), motivo e o evento com o admin na mesma transação.
   */
  abstract review(
    id: string,
    adminId: string,
    decide: (current: HitItemSnapshot) => Result<HitItemDecision, ReviewError>,
  ): Promise<Result<AdminHitItemRecord, ReviewError>>
}
