import type { ShopCategory, ShopPlan, ShopStatus } from '#shared/schemas/shop'
import type { ProgramMode } from '#shared/schemas/program'
import type { ShopStatusResult } from '../../database/shop-status'
import type { ShopActionPlan, ShopCursor } from './shops.rules'

export interface AdminShopRecord {
  readonly id: string
  readonly name: string
  readonly category: ShopCategory
  readonly neighborhood: string
  readonly status: ShopStatus
  readonly plan: ShopPlan
  readonly createdAt: Date
}

export interface AdminShopListFilter {
  readonly status: ShopStatus | null
  readonly name: string | null
  readonly after: ShopCursor | null
  readonly limit: number
}

export interface AdminShopHistoryRecord {
  readonly id: string
  readonly fromStatus: ShopStatus
  readonly toStatus: ShopStatus
  readonly plan: ShopPlan
  readonly actorName: string
  readonly reason: string | null
  readonly createdAt: Date
}

/** Dono ainda cifrado: quem decifra é o service, só para o detalhe. `null` se a conta foi apagada. */
export interface AdminShopOwnerRecord {
  readonly phoneEncrypted: Buffer
  readonly emailEncrypted: Buffer | null
}

export interface AdminShopDetailRecord extends AdminShopRecord {
  readonly addressLine: string
  readonly program: { readonly rewardTitle: string; readonly mode: ProgramMode; readonly target: number } | null
  readonly owner: AdminShopOwnerRecord | null
  readonly customers: number
  readonly visitsLast30Days: number
  readonly history: readonly AdminShopHistoryRecord[]
}

export abstract class AdminShopsRepository {
  /** Pendentes primeiro, depois `created_at desc nulls last`, `id` desempata. Pede `limit` linhas (o service passa a página + 1). */
  abstract list(filter: AdminShopListFilter): Promise<readonly AdminShopRecord[]>
  abstract findDetail(shopId: string): Promise<AdminShopDetailRecord | null>
  /** Muda situação/plano e grava o evento com o admin, na mesma transação, com a loja travada. */
  abstract applyAction(shopId: string, adminId: string, action: ShopActionPlan): Promise<ShopStatusResult>
}
