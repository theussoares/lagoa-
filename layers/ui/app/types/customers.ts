import type { CustomerId } from '#shared/schemas/ids'
import type { MaskedPhone } from '#shared/schemas/phone'

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
  readonly acceptsNotifications: boolean
}

export interface CustomerTableLabels {
  readonly customer: string
  readonly card: string
  /** Visitas que deram carimbo ou ponto; resgates não contam. */
  readonly visits: string
  readonly lastVisit: string
  readonly notifications: string
  readonly noName: string
  readonly rewardReady: string
  readonly lapsed: string
  readonly acceptsNotifications: string
  readonly noNotifications: string
}
