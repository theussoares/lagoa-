/** Modelos da aba Hits do cliente (vitrine de produtos). Texto já traduzido. */

import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ExternalLinkModel } from '#layers/ui/app/types/discover'
import type { ShopGroup } from '#shared/domain/shopGroup'
import type { PublicHitItem, PublicHitItemPage } from '#shared/schemas/showcase'
import type { TransportError } from '#shared/types/errors'

/** Selo do "rende": "rende 1 carimbo" e, no dia surpresa, "em dobro hoje". */
export interface HitItemEarningModel {
  readonly label: string
  readonly doubled: string | null
}

export interface HitItemCardModel {
  readonly id: string
  readonly title: string
  readonly shopName: string
  readonly photoUrl: string
  /** "R$ 59,90" ou "Sob consulta". */
  readonly price: string
  /** `null` quando não dá para dizer quanto rende: sem selo. */
  readonly earning: HitItemEarningModel | null
  /** Botão do produto (o dele ou o da loja); `null` sem botão. */
  readonly contact: ExternalLinkModel | null
}

export interface HitsBannerModel {
  readonly id: string
  readonly title: string
  readonly shopName: string
  readonly photoUrl: string
  /** "Patrocinado" (pago) ou "Destaque" (Pro). */
  readonly seal: string
}

export type HitsPageState = AsyncResultState<PublicHitItemPage, TransportError>

/** Lista paginada de um ramo: a primeira página e as que o "Ver mais" acrescentou. */
export interface HitsFeed {
  readonly state: HitsPageState
  readonly items: readonly PublicHitItem[]
  readonly canLoadMore: boolean
  readonly loadingMore: boolean
  readonly moreError: TransportError['code'] | null
  loadMore: () => Promise<void>
  reload: () => Promise<void>
}

export interface CustomerHitsScreen {
  readonly cityHeaderImage: string
  readonly banners: readonly HitsBannerModel[]
  group: ShopGroup | null
  readonly items: readonly HitItemCardModel[]
  readonly loading: boolean
  readonly errorCode: TransportError['code'] | null
  /** Vitrine inteira vazia (sem ramo escolhido). */
  readonly empty: boolean
  /** Ramo escolhido sem produto. */
  readonly groupEmpty: boolean
  readonly canLoadMore: boolean
  readonly loadingMore: boolean
  readonly moreError: TransportError['code'] | null
  loadMore: () => Promise<void>
  reload: () => Promise<void>
}
