/** Modelos da tela Descobrir. Texto já traduzido pela superfície. */

import type { RulerProgress } from './progress'

export interface ChallengeStopModel {
  readonly id: string
  readonly shopName: string
  readonly icon: string
  readonly visited: boolean
  readonly tilt: number
  /** "Café da Orla: visitada" */
  readonly label: string
}

export interface ChallengeModel {
  readonly id: string
  readonly title: string
  readonly description: string
  /** "Até 21 de out." */
  readonly deadline: string | null
  /** "1 de 3 visitadas" */
  readonly progress: string
  readonly done: boolean
  readonly stops: readonly ChallengeStopModel[]
}

export type ShopPreview = { readonly kind: 'slots'; readonly total: number; readonly welcome: number } | RulerProgress

export interface ShopShowcaseModel {
  /** Banner, a capa do card. */
  readonly image: string | null
  /** Logo no círculo; sem ele, o carimbo da categoria. */
  readonly logo: string | null
  /** "4,8" */
  readonly rating: string | null
  /** "0,8 km" */
  readonly distance: string | null
  /** "Aberta agora" quando aberta; nulo quando fechada ou desconhecida. */
  readonly openLabel: string | null
}

export interface ShopTeaserModel {
  readonly id: string
  readonly shopName: string
  /** "Lapa · Endereço de exemplo, Lapa" */
  readonly place: string
  readonly icon: string
  readonly tilt: number
  /** "10 carimbos = Pão de queijo grande" */
  readonly rule: string
  /** "1 carimbo por visita" */
  readonly earn: string
  /** "Cartão novo já começa com 2 carimbos." */
  readonly welcome: string | null
  readonly preview: ShopPreview
  /** "Conta no desafio" */
  readonly tag: string | null
  readonly showcase: ShopShowcaseModel
  /** Link para o mapa: o card leva até a loja, que é onde o cartão abre. */
  readonly directions: ExternalLinkModel
}

export interface ExternalLinkModel {
  readonly label: string
  /** Nome completo para leitor de tela: "Como chegar: Barbearia Navalha (abre o mapa)". */
  readonly accessibleLabel: string
  readonly href: string
}

export interface KnownShopModel {
  readonly id: string
  readonly shopName: string
  readonly icon: string
  readonly tilt: number
  readonly rule: string
  readonly showcase: ShopShowcaseModel
}
