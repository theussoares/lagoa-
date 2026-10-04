import type { EarningCard, EarningPlan } from '#shared/domain/earning'
import type { Birthday } from '#shared/schemas/common'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { CatalogShop } from '../../shops/catalog-shop'

/** O programa da loja mudou entre a leitura e o lock; quem chama lê de novo e tenta uma vez mais. */
export class ProgramVersionChanged extends Error {}

export interface CheckInShop {
  readonly shop: CatalogShop
  readonly programId: string
  readonly checkInEnabled: boolean
  readonly cooldownHours: number
}

/** O que a regra precisa saber, lido com o cartão já travado. */
export interface CheckInState {
  /** O cartão já existe (travado); `lastVisitAt` nulo = primeira visita da pessoa nesta loja. */
  readonly card: EarningCard
  readonly birthday: Birthday | null
}

export interface CheckInRecorded {
  readonly cardId: string
  readonly entryId: string
  /** Unidades da visita (sem as boas-vindas) e saldo do cartão. */
  readonly units: number
  readonly balanceAfter: number
  readonly recordedAt: Date
  /** `true`: o mesmo `Idempotency-Key` já tinha sido gravado e nada novo foi escrito. */
  readonly replayed: boolean
}

export interface CheckInAttempt {
  readonly customerId: string
  readonly shop: CheckInShop
  readonly now: Date
  /** Do cabeçalho `Idempotency-Key`; reenviar o mesmo devolve o carimbo já gravado em vez de `checkInCooldown`. */
  readonly clientKey?: string
}

export abstract class CheckInRepository {
  /** Versão do programa que vale para esta pessoa: a do cartão com saldo, senão a ativa. Só loja aprovada: a pendente ou suspensa é indistinguível de um código que não existe. */
  abstract findShopByCode(code: string, customerId: string): Promise<CheckInShop | null>

  /**
   * Trava (ou cria) o cartão, deixa `decide` escolher o plano e grava ledger + saldo na mesma
   * transação. Se `decide` recusar, nada é gravado, nem o cartão novo. Com `clientKey` já gravado, devolve
   * o lançamento anterior sem decidir nem escrever nada.
   */
  abstract record<E>(
    attempt: CheckInAttempt,
    decide: (state: CheckInState) => Result<EarningPlan, E>,
  ): Promise<Result<CheckInRecorded, E | ErrorOf<'unauthorized'>>>
}
