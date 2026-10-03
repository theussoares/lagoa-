import type { ProgramUnit } from '#shared/schemas/program'
import type { LedgerKind } from '#shared/schemas/visit'
import type { CatalogShop } from '../../shops/catalog-shop'
import type { EarnedEntry } from './stamps'

export interface WalletCardRecord {
  readonly cardId: string
  readonly programId: string
  readonly balance: number
  readonly lastVisitAt: Date | null
  readonly rewardExpiresAt: Date | null
  readonly shop: CatalogShop
  /** Só nos clubes de carimbos, da linha mais nova para a mais antiga (o bastante para cobrir o saldo). */
  readonly earned: readonly EarnedEntry[]
}

/** Tipos do `shared` que a caderneta do cliente mostra (sem presente de campanha). */
export type ActivityKind = Exclude<LedgerKind, 'campaignBonus'>
export const ACTIVITY_KINDS: readonly ActivityKind[] = ['visit', 'amount', 'checkIn', 'redemption']

export function isActivityKind(kind: string): kind is ActivityKind {
  return ACTIVITY_KINDS.some((known) => known === kind)
}

export interface ActivityRecord {
  readonly id: string
  readonly shopId: string
  readonly shopName: string
  readonly kind: ActivityKind
  readonly unit: ProgramUnit
  readonly unitsDelta: number
  /** Título guardado no resgate (snapshot); `null` nas outras linhas. */
  readonly rewardTitle: string | null
  readonly occurredAt: Date
}

/** Toda leitura é do cliente dono (`customerId` vem do JWT) e limitada. */
export abstract class WalletRepository {
  /** Só cartões de lojas aprovadas. */
  abstract listCards(customerId: string): Promise<WalletCardRecord[]>
  abstract findCard(customerId: string, shopId: string): Promise<WalletCardRecord | null>
  /** Mais nova primeiro. */
  abstract listActivity(customerId: string, kinds: readonly ActivityKind[], limit: number): Promise<ActivityRecord[]>
}
