import type { EarningCard, EarningPlan } from '#shared/domain/earning'
import type { VisitQrSnapshot } from '#shared/domain/visitQr'
import type { Birthday } from '#shared/schemas/common'
import type { VisitCode, VisitQrEarn } from '#shared/schemas/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { CatalogShop } from '../../shops/catalog-shop'

/** O programa da loja mudou entre a leitura e o lock; quem chama lê de novo e tenta uma vez mais. */
export class ProgramVersionChanged extends Error {}

/** Como o QR chegou: o token (hash dele) pelo link/câmera, ou o código curto digitado. */
export type VisitQrLookup =
  | { readonly kind: 'tokenHash'; readonly tokenHash: Buffer }
  | { readonly kind: 'visitCode'; readonly code: VisitCode }

export interface VisitQrTarget {
  readonly visitQrId: string
  /** Loja + regras da versão que credita para esta pessoa: a do cartão com saldo, senão a ativa. */
  readonly shop: CatalogShop
  /** Versão cujas regras estão em `shop`; é a que o cartão passa a ter se estiver zerado. */
  readonly programId: string
  /** Da versão ativa: a política vigente da loja vale, não a do cartão. */
  readonly cooldownHours: number
  /** Quem atestou a venda; vira `recordedBy` no ledger. */
  readonly issuedBy: string
  readonly earn: VisitQrEarn
}

/** O QR lido com a linha travada (`FOR UPDATE`): é o que decide uso único e validade. */
export interface LockedVisitQr extends VisitQrSnapshot {
  readonly claimedAt: Date | null
  readonly ledgerEntryId: string | null
}

/** O que a regra de ganho precisa saber, lido com o cartão já travado. */
export interface VisitClaimState {
  /** O cartão já existe (travado); `lastVisitAt` nulo = primeira visita da pessoa nesta loja. */
  readonly card: EarningCard
  readonly birthday: Birthday | null
}

export interface VisitClaimRecorded {
  readonly cardId: string
  readonly entryId: string
  /** Unidades da visita (sem as boas-vindas) e saldo do cartão. */
  readonly units: number
  readonly balanceAfter: number
  readonly recordedAt: Date
  /** `true`: a mesma pessoa reenviou o QR já usado por ela; nada foi escrito. */
  readonly replayed: boolean
}

export interface VisitClaimDeciders<E> {
  readonly qr: (qr: LockedVisitQr) => Result<'claim' | 'replay', E>
  readonly earning: (state: VisitClaimState) => Result<EarningPlan, E>
}

export abstract class CheckInRepository {
  /**
   * O QR em qualquer situação (o decisor precisa ver usado e cancelado), sem lock. `null` se não existe ou se a loja
   * não está aprovada com programa ativo: tudo isso é indistinguível para quem pergunta. Pelo código curto vale a
   * linha mais nova.
   */
  abstract findVisitQr(lookup: VisitQrLookup, customerId: string): Promise<VisitQrTarget | null>

  /**
   * Uma transação: trava o QR (`FOR UPDATE`), relê a situação e chama `decide.qr`; replay devolve o lançamento gravado
   * (mesmo `entryId`). Senão trava/cria o cartão (`LedgerStore.lockOrCreateCard`, vencimento aplicado), alinha a
   * versão, chama `decide.earning`, credita (`LedgerStore.credit`: `kind` = `earn.kind`, `recordedBy = issuedBy`,
   * `amountCents`, chave `visit-qr:<visitQrId>`) e marca o QR `claimed`. Recusa de qualquer decisor = rollback total
   * (cartão novo inclusive).
   */
  abstract claim<E>(
    attempt: { readonly customerId: string; readonly target: VisitQrTarget; readonly now: Date },
    decide: VisitClaimDeciders<E>,
  ): Promise<Result<VisitClaimRecorded, E | ErrorOf<'unauthorized'>>>

  /** Anota a última recusa por janela no QR ainda ativo (fora da transação do ganho): o QR não é consumido. */
  abstract noteRefusal(visitQrId: string, refusal: { readonly availableAt: Date; readonly refusedAt: Date }): Promise<void>
}
