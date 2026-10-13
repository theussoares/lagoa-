import type { CustomerId } from '#shared/schemas/ids'
import type { MaskedPhone } from '#shared/schemas/phone'
import type { CustomerFilter, MerchantCustomerPage } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ComputedRef, Ref } from 'vue'

/** Modelos de exibição da tela Clientes. Texto pronto em pt-BR; celular só mascarado. */

export interface CustomerRowModel {
  readonly id: CustomerId
  /** Primeiro nome, ou `null` quando o cliente não informou. */
  readonly name: string | null
  /** `(67) 9••••-0374` — nunca o número completo. */
  readonly phone: MaskedPhone
  /** "7 de 10 carimbos", "320 de 500 pontos". */
  readonly progress: string
  /** 0 a 1, para a régua da coluna do cartão. */
  readonly progressRatio: number
  readonly rewardReady: boolean
  /** Visitas que deram carimbo ou ponto; resgates não contam. */
  readonly visits: string
  /** "hoje", "há 3 dias", "há 42 dias", "nunca". */
  readonly lastVisit: string
  readonly isLapsed: boolean
  /** Valor da compra mais recente, "R$ 24,90"; `null` se nenhuma trouxe valor. */
  readonly lastPurchase: string | null
}

export interface CustomerTableLabels {
  readonly customer: string
  readonly card: string
  /** Visitas que deram carimbo ou ponto; resgates não contam. */
  readonly visits: string
  readonly lastVisit: string
  readonly lastPurchase: string
  readonly noName: string
  readonly rewardReady: string
  readonly lapsed: string
  readonly noPurchase: string
}

export interface MerchantCustomers {
  filter: Ref<CustomerFilter>
  /** Páginas já carregadas juntas em `items`; `total` conta o filtro inteiro. */
  state: ComputedRef<AsyncResultState<MerchantCustomerPage, TransportError>>
  reload: () => Promise<void>
  /** Busca a próxima página e junta ao fim; não faz nada sem `nextCursor`. */
  loadMore: () => Promise<void>
  loadingMore: Ref<boolean>
  /** Falha do último "Carregar mais"; a lista já carregada continua na tela. */
  loadMoreError: Ref<TransportError | null>
}
