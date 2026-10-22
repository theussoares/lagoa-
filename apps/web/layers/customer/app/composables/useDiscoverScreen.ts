import type { ShopSummary } from '#shared/schemas/shop'
import { formatShortDate } from '#shared/utils/dateFormat'
import type { DiscoverScreen } from '../types/discover'

/** Descobrir: lojas novas e conhecidas, desafios da cidade e busca; com a chave do Hits, em trilhos. */
export function useDiscoverScreen(): DiscoverScreen {
  const translate = useTranslate()
  const { signOut } = useCustomerSession()
  const { state: shopsState, reload: reloadShops } = useDiscoverShops()
  const { state: challengesState } = useDiscoverChallenges()
  const { state: cardsState } = useWalletCards()
  const cityHeaderImage = useCityHeaderImage()

  const shops = computed(() => (shopsState.value.status === 'success' ? shopsState.value.value : []))
  const challenges = computed(() => (challengesState.value.status === 'success' ? challengesState.value.value : []))
  const walletShopIds = computed(
    () => new Set<string>(cardsState.value.status === 'success' ? cardsState.value.value.map((card) => card.shopId) : []),
  )

  // Sem saber a carteira, toda loja ia parecer nova: a lista espera os cartões.
  const loading = computed(() => shopsState.value.status === 'loading' || cardsState.value.status === 'loading')

  const query = ref('')
  const searching = computed(() => query.value.trim() !== '')
  const showcase = useDiscoverRails(shops, walletShopIds, searching, translate)
  const visibleShops = computed(() => filterShops(showcase.shops, query.value))
  const groups = computed(() => groupShops(visibleShops.value, walletShopIds.value))
  const challengeShopIds = computed(() => pendingChallengeShopIds(challenges.value))
  const fresh = computed(() => sortByDistance(groups.value.fresh).map((shop) => toShopTeaserModel(shop, challengeShopIds.value, translate)))
  const known = computed(() => groups.value.known.map((shop) => toKnownShopModel(shop, translate)))
  const challengeModels = computed(() => {
    const byId = new Map<string, ShopSummary>(shops.value.map((shop) => [shop.id, shop]))
    return challenges.value.map((challenge) => toChallengeModel(challenge, byId, translate, formatShortDate))
  })

  // O primeiro desafio em andamento vira o herói da tela; os outros seguem como cartões. Nos trilhos, quem sobe
  // sobre a faixa é o carrossel de destaque, e todos os desafios vão para a lista.
  const heroChallenge = computed(() => (showcase.enabled ? null : (challengeModels.value.find((challenge) => !challenge.done) ?? null)))
  const otherChallenges = computed(() => challengeModels.value.filter((challenge) => challenge.id !== heroChallenge.value?.id))

  const unauthorized = computed(() =>
    showcase.unauthorized ||
    [shopsState.value, challengesState.value, cardsState.value].some(
      (state) => state.status === 'error' && state.error.code === 'unauthorized',
    ),
  )
  watch(unauthorized, (value) => {
    if (value) void signOut()
  })

  return reactive({
    query,
    searching,
    loading,
    shopsState,
    reloadShops,
    shopCount: computed(() => shops.value.length),
    fresh,
    known,
    heroChallenge,
    otherChallenges,
    cityHeaderImage,
    mapUrl: shopsMapUrl(),
    featured: toRef(showcase, 'featured'),
    group: toRef(showcase, 'group'),
    showGroups: toRef(showcase, 'showGroups'),
    rails: toRef(showcase, 'rails'),
    groupEmpty: toRef(showcase, 'groupEmpty'),
    showFresh: computed(() => !showcase.showGroups || fresh.value.length > 0),
    headerOverlap: computed(() => !showcase.enabled || showcase.featured.length > 0),
  })
}
