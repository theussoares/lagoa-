import type { HitItemStatus } from '#shared/schemas/hitItem'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { ShopContactColumns } from '../../shops/shop-contact-columns'

export interface HitItemRow extends ShopContactColumns {
  readonly id: string
  readonly shopId: string
  readonly title: string
  readonly description: string | null
  readonly priceCents: number | null
  readonly photoPath: string | null
  readonly status: HitItemStatus
  readonly rejectionReason: string | null
  readonly endsAt: Date | null
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Colunas que a edição do lojista pode trocar; o que não vem aqui não muda. */
export type HitItemPatch = Partial<
  Pick<HitItemRow, 'title' | 'description' | 'priceCents' | 'photoPath' | 'status' | 'rejectionReason' | 'endsAt' | 'version'> & ShopContactColumns
>

export type HitItemDraftValues = Pick<HitItemRow, 'title' | 'description' | 'priceCents' | 'endsAt'> & ShopContactColumns

type MutationError = ErrorOf<'notFound' | 'limitReached' | 'invalidTransition'>

export abstract class HitsRepository {
  abstract findForShop(shopId: string, id: string): Promise<HitItemRow | null>
  /** Todos os ativos e os `archivedLimit` arquivados mais novos, do mais novo para o mais antigo. */
  abstract listForShop(shopId: string, archivedLimit: number): Promise<readonly HitItemRow[]>
  /**
   * Cria o item se a regra deixar. Trava a loja (`FOR UPDATE`) para duas criações ao mesmo tempo não passarem do teto.
   * `canCreate` recebe quantos itens ativos a loja já tem.
   */
  abstract insert(
    shopId: string,
    draft: HitItemDraftValues,
    canCreate: (activeCount: number) => Result<void, ErrorOf<'limitReached'>>,
  ): Promise<Result<HitItemRow, ErrorOf<'limitReached'>>>
  /**
   * Troca o item numa transação: trava a loja e a linha do item (`WHERE id AND shop_id`), deixa `mutate` decidir e,
   * se o status mudou, grava o evento (`actor_admin_id` nulo) junto. Item de outra loja é `notFound`.
   */
  abstract updateLocked(
    shopId: string,
    id: string,
    mutate: (row: HitItemRow, activeCount: number) => Result<HitItemPatch, MutationError>,
  ): Promise<Result<HitItemRow, MutationError>>
}
