import type { EarningCard, EarningPlan } from '#shared/domain/earning'
import type { Birthday } from '#shared/schemas/common'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { CatalogShop } from '../../shops/catalog-shop'

export interface CheckInShop {
  readonly shop: CatalogShop
  readonly programId: string
  readonly checkInEnabled: boolean
  readonly cooldownHours: number
}

/** O que a regra precisa saber, lido com o cartão já travado. */
export interface CheckInState {
  /** `null` = cartão recém-criado nesta transação (ganha as boas-vindas). */
  readonly card: EarningCard | null
  readonly lastVisitAt: Date | null
  readonly birthday: Birthday | null
}

export interface CheckInRecorded {
  readonly cardId: string
  readonly entryId: string
  readonly plan: EarningPlan
}

export interface CheckInAttempt {
  readonly customerId: string
  readonly shop: CheckInShop
  readonly now: Date
}

export abstract class CheckInRepository {
  /** Só loja aprovada: a pendente ou suspensa é indistinguível de um código que não existe. */
  abstract findShopByCode(code: string): Promise<CheckInShop | null>

  /**
   * Trava (ou cria) o cartão, deixa `decide` escolher o plano e grava ledger + saldo na mesma
   * transação. Se `decide` recusar, nada é gravado, nem o cartão novo.
   */
  abstract record<E>(
    attempt: CheckInAttempt,
    decide: (state: CheckInState) => Result<EarningPlan, E>,
  ): Promise<Result<CheckInRecorded, E | ErrorOf<'unauthorized'>>>
}
