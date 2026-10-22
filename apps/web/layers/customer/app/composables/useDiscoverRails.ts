import type { Ref } from 'vue'
import type { ShopGroup } from '#shared/domain/shopGroup'
import type { ShopSummary } from '#shared/schemas/shop'
import type { FeaturedShop } from '#shared/schemas/showcase'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { Translate } from '#layers/core/app/types/i18n'
import type { TransportError } from '#shared/types/errors'
import type { DiscoverShowcase } from '../types/discover'

const NOTHING_FEATURED: AsyncResultState<FeaturedShop[], TransportError> = { status: 'success', value: [] }

/**
 * Descobrir em trilhos (chave do Hits): carrossel de destaque, chips de ramo e os trilhos "Dia surpresa" e
 * "Cartão já começa andado". O destaque carrega à parte: se falhar, o carrossel some e o resto da tela segue.
 */
export function useDiscoverRails(shops: Ref<ShopSummary[]>, searching: Ref<boolean>, translate: Translate): DiscoverShowcase {
  const enabled = useHitsEnabled()
  // A chave é fixa no build: sem ela o Descobrir nem pede o destaque.
  const featuredState = enabled ? useDiscoverFeatured().state : computed(() => NOTHING_FEATURED)
  const group = ref<ShopGroup | null>(null)

  const railsOn = computed(() => enabled && !searching.value)
  const rails = computed(() => buildDiscoverRails(shops.value, railsOn.value ? group.value : null))
  const featured = computed(() =>
    featuredState.value.status === 'success'
      ? featuredState.value.value.map((shop) => toShopRailCardModel(shop, translate, { sponsored: shop.sponsored }))
      : [],
  )

  return reactive({
    enabled,
    featured,
    group,
    showGroups: railsOn,
    rails: computed(() => (railsOn.value ? toDiscoverRailModels(rails.value, translate) : [])),
    groupEmpty: computed(() => {
      if (!railsOn.value || group.value === null) return false
      const { surpriseDay, welcome, others } = rails.value
      return surpriseDay.length + welcome.length + others.length === 0
    }),
    shops: computed(() => (railsOn.value ? rails.value.others : shops.value)),
    unauthorized: computed(() => featuredState.value.status === 'error' && featuredState.value.error.code === 'unauthorized'),
  })
}
