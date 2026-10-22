import type { Ref } from 'vue'
import type { ShopGroup } from '#shared/domain/shopGroup'
import type { HitsQuery, PublicHitItem, PublicHitItemPage } from '#shared/schemas/showcase'
import type { TransportError } from '#shared/types/errors'
import type { HitsFeed, HitsPageState } from '../types/hits'

interface ExtraPages {
  readonly items: readonly PublicHitItem[]
  readonly nextCursor: string | null
}

function queryFor(group: ShopGroup | null, cursor?: string): HitsQuery {
  return { ...(group === null ? {} : { group }), ...(cursor === undefined ? {} : { cursor }) }
}

/**
 * Lista do Hits por ramo. A primeira página de "Tudo" vem no SSR; o ramo escolhido e o "Ver mais" pedem no
 * navegador. Cada troca de ramo abre uma geração nova: resposta que chega de uma geração velha é descartada.
 */
export function useHitsFeed(group: Ref<ShopGroup | null>): HitsFeed {
  const { hits } = useCustomerServices()
  const firstPage = useAsyncQuery('hits-items', () => hits.list(queryFor(null)))
  const groupState = shallowRef<HitsPageState | null>(null)
  const extra = shallowRef<ExtraPages | null>(null)
  const loadingMore = ref(false)
  const moreError = ref<TransportError['code'] | null>(null)
  let generation = 0

  const state = computed<HitsPageState>(() => groupState.value ?? firstPage.state.value)
  const page = computed<PublicHitItemPage | null>(() => (state.value.status === 'success' ? state.value.value : null))
  const nextCursor = computed(() => (extra.value === null ? (page.value?.nextCursor ?? null) : extra.value.nextCursor))

  function startGeneration(): number {
    generation += 1
    extra.value = null
    loadingMore.value = false
    moreError.value = null
    return generation
  }

  async function loadGroup(selected: ShopGroup): Promise<void> {
    const mine = startGeneration()
    groupState.value = { status: 'loading' }
    const result = await hits.list(queryFor(selected))
    if (mine !== generation) return
    groupState.value = result.ok ? { status: 'success', value: result.value } : { status: 'error', error: result.error }
  }

  async function showAll(): Promise<void> {
    startGeneration()
    groupState.value = null
    // Volta para "Tudo" com o que o SSR trouxe; se a primeira página tinha falhado, tenta de novo.
    if (firstPage.state.value.status === 'error') await firstPage.reload()
  }

  watch(group, (selected) => void (selected === null ? showAll() : loadGroup(selected)))

  async function reload(): Promise<void> {
    if (group.value !== null) return loadGroup(group.value)
    startGeneration()
    groupState.value = null
    await firstPage.reload()
  }

  async function loadMore(): Promise<void> {
    const cursor = nextCursor.value
    if (cursor === null || loadingMore.value || page.value === null) return
    const mine = generation
    loadingMore.value = true
    moreError.value = null
    const result = await hits.list(queryFor(group.value, cursor))
    if (mine !== generation) return
    loadingMore.value = false
    if (!result.ok) {
      moreError.value = result.error.code
      return
    }
    extra.value = { items: [...(extra.value?.items ?? []), ...result.value.items], nextCursor: result.value.nextCursor }
  }

  return reactive({
    state,
    items: computed(() => (page.value === null ? [] : [...page.value.items, ...(extra.value?.items ?? [])])),
    canLoadMore: computed(() => nextCursor.value !== null),
    loadingMore,
    moreError,
    loadMore,
    reload,
  })
}
