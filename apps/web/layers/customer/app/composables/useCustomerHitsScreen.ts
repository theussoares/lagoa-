import type { ShopGroup } from '#shared/domain/shopGroup'
import type { CustomerHitsScreen } from '../types/hits'
import { toHitItemCardModel, toHitsBannerModel } from '../utils/hitItemView'

/** Aba Hits: banners (somem se vazios ou se falharem), chips de ramo e a grade de produtos com "Ver mais". */
export function useCustomerHitsScreen(): CustomerHitsScreen {
  const translate = useTranslate()
  const { signOut } = useCustomerSession()
  const { hits } = useCustomerServices()
  const { state: bannersState } = useAsyncQuery('hits-banners', () => hits.banners())
  const group = ref<ShopGroup | null>(null)
  const feed = useHitsFeed(group)

  const banners = computed(() =>
    bannersState.value.status === 'success' ? bannersState.value.value.map((banner) => toHitsBannerModel(banner, translate)) : [],
  )
  const items = computed(() => feed.items.map((item) => toHitItemCardModel(item, translate)))
  const loaded = computed(() => feed.state.status === 'success')
  const errorCode = computed(() => (feed.state.status === 'error' ? feed.state.error.code : null))

  const unauthorized = computed(() =>
    [errorCode.value, feed.moreError, bannersState.value.status === 'error' ? bannersState.value.error.code : null].includes('unauthorized'),
  )
  watch(unauthorized, (value) => {
    if (value) void signOut()
  })

  return reactive({
    cityHeaderImage: useCityHeaderImage(),
    banners,
    group,
    items,
    loading: computed(() => feed.state.status === 'loading'),
    errorCode,
    empty: computed(() => loaded.value && items.value.length === 0 && group.value === null),
    groupEmpty: computed(() => loaded.value && items.value.length === 0 && group.value !== null),
    canLoadMore: toRef(feed, 'canLoadMore'),
    loadingMore: toRef(feed, 'loadingMore'),
    moreError: toRef(feed, 'moreError'),
    loadMore: feed.loadMore,
    reload: feed.reload,
  })
}
