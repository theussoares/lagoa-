import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ChallengeModel, ExternalLinkModel, KnownShopModel, ShopTeaserModel } from '#layers/ui/app/types/discover'
import type { ShopGroup } from '#shared/domain/shopGroup'
import type { ShopSummary } from '#shared/schemas/shop'
import type { TransportError } from '#shared/types/errors'

export interface ShopGroups {
  /** Lojas onde a pessoa ainda não tem cartão. */
  readonly fresh: readonly ShopSummary[]
  readonly known: readonly ShopSummary[]
}

/** Vitrine em trilhos: cada loja cai num trilho só (dia surpresa, depois boas-vindas, depois o resto). */
export interface DiscoverRails {
  /** Inclui lojas da carteira: o dobro vale para todo mundo. */
  readonly surpriseDay: ShopSummary[]
  /** Só lojas sem cartão: boas-vindas é para cartão novo. */
  readonly welcome: ShopSummary[]
  /** Lojas sem cartão fora dos trilhos. */
  readonly others: ShopSummary[]
  /** Todas as lojas da carteira (do ramo), estejam ou não no "Dia surpresa". */
  readonly known: ShopSummary[]
}

/** Card pequeno da loja no carrossel de destaque e nos trilhos. */
export interface ShopRailCardModel {
  readonly id: string
  readonly shopName: string
  /** "Comer · Centro" */
  readonly meta: string
  readonly image: string | null
  readonly icon: string
  /** "Destaque": todo card do carrossel (pago ou Pro). */
  readonly badge: string | null
  /** Selo do que rende mais: "2× hoje" ou "+2 de cara". */
  readonly seal: string | null
  /** Para onde o card leva: o mesmo destino do `ShopTile`. */
  readonly to: string
  /** Botão da loja (WhatsApp ou link), o mesmo do card padrão; `null` sem botão cadastrado. */
  readonly contact: ExternalLinkModel | null
}

export interface DiscoverRailModel {
  readonly id: 'surpriseDay' | 'welcome'
  readonly title: string
  readonly lead: string
  readonly cards: readonly ShopRailCardModel[]
}

/** O que a chave do Hits acrescenta ao Descobrir; desligada, fica tudo vazio. */
export interface DiscoverShowcase {
  /** Chave do Hits ligada. */
  readonly enabled: boolean
  readonly featured: ShopRailCardModel[]
  group: ShopGroup | null
  /** Chips de ramo: com a chave e fora da busca. */
  readonly showGroups: boolean
  /** Trilhos com pelo menos uma loja. */
  readonly rails: DiscoverRailModel[]
  /** O ramo escolhido não tem loja nenhuma. */
  readonly groupEmpty: boolean
  /** Lojas das listas "Perto de você" e "Na sua carteira": fora dos trilhos e as da carteira (todas, sem a chave ou na busca). */
  readonly shops: ShopSummary[]
  /** O destaque disse que a sessão caiu. */
  readonly unauthorized: boolean
}

export interface DiscoverScreen {
  query: string
  readonly searching: boolean
  readonly loading: boolean
  readonly shopsState: AsyncResultState<ShopSummary[], TransportError>
  readonly reloadShops: () => Promise<void>
  readonly shopCount: number
  readonly fresh: ShopTeaserModel[]
  readonly known: KnownShopModel[]
  readonly heroChallenge: ChallengeModel | null
  readonly otherChallenges: ChallengeModel[]
  readonly cityHeaderImage: string
  readonly mapUrl: string
  readonly featured: ShopRailCardModel[]
  group: ShopGroup | null
  readonly showGroups: boolean
  readonly rails: DiscoverRailModel[]
  readonly groupEmpty: boolean
  /** Sem a chave, "Perto de você" aparece mesmo vazio (com o aviso); com ela, só quando sobra loja. */
  readonly showFresh: boolean
  /** O cabeçalho deixa espaço para o card que sobe: o desafio herói ou o carrossel de destaque. */
  readonly headerOverlap: boolean
}
