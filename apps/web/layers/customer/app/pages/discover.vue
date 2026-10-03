<script setup lang="ts">
import type { ShopSummary } from '#shared/schemas/shop'
import { formatShortDate } from '#shared/utils/dateFormat'

definePageMeta({ path: '/descobrir', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const translate = useTranslate()
useHead({ title: () => `${t('discover.title')} · ${t('app.name')}` })

const { signOut } = useCustomerSession()
const { state: shopsState, reload: reloadShops } = useDiscoverShops()
const { state: challengesState } = useDiscoverChallenges()
const { state: cardsState } = useWalletCards()

const shops = computed(() => (shopsState.value.status === 'success' ? shopsState.value.value : []))
const challenges = computed(() => (challengesState.value.status === 'success' ? challengesState.value.value : []))
const walletShopIds = computed(
  () => new Set<string>(cardsState.value.status === 'success' ? cardsState.value.value.map((card) => card.shopId) : []),
)

// Sem saber a carteira, toda loja ia parecer nova: a lista espera os cartões.
const loading = computed(() => shopsState.value.status === 'loading' || cardsState.value.status === 'loading')

const query = ref('')
const searching = computed(() => query.value.trim() !== '')
const visibleShops = computed(() => filterShops(shops.value, query.value))
const groups = computed(() => groupShops(visibleShops.value, walletShopIds.value))
const challengeShopIds = computed(() => pendingChallengeShopIds(challenges.value))
const fresh = computed(() => sortByDistance(groups.value.fresh).map((shop) => toShopTeaserModel(shop, challengeShopIds.value, translate)))
const known = computed(() => groups.value.known.map((shop) => toKnownShopModel(shop, translate)))
const challengeModels = computed(() => {
  const byId = new Map<string, ShopSummary>(shops.value.map((shop) => [shop.id, shop]))
  return challenges.value.map((challenge) => toChallengeModel(challenge, byId, translate, formatShortDate))
})

// O primeiro desafio em andamento vira o herói da tela; os outros seguem como cartões.
const heroChallenge = computed(() => challengeModels.value.find((challenge) => !challenge.done) ?? null)
const otherChallenges = computed(() => challengeModels.value.filter((challenge) => challenge.id !== heroChallenge.value?.id))

const CITY_HEADER_IMAGE = '/example/city.svg'
const mapUrl = shopsMapUrl()

const unauthorized = computed(() =>
  [shopsState.value, challengesState.value, cardsState.value].some(
    (state) => state.status === 'error' && state.error.code === 'unauthorized',
  ),
)
watch(unauthorized, (value) => {
  if (value) void signOut()
})
</script>

<template>
  <div>
    <ScreenHeader :title="t('discover.title')" :lead="t('discover.lead')" :image="CITY_HEADER_IMAGE">
      <template #actions>
        <a
          :href="mapUrl"
          target="_blank"
          rel="noopener"
          class="grid size-11 shrink-0 place-items-center rounded-full bg-white text-(--lagoa-header) shadow-(--lagoa-shadow-card)"
          :aria-label="t('discover.mapLinkLabel')"
        >
          <UIcon name="i-ph-map-trifold" class="size-6" aria-hidden="true" />
        </a>
      </template>
      <UInput
        v-model="query"
        type="search"
        size="xl"
        icon="i-ph-magnifying-glass"
        :placeholder="t('discover.searchPlaceholder')"
        :aria-label="t('discover.searchLabel')"
        class="w-full"
        :ui="{ base: 'h-12 rounded-full bg-default' }"
      />
    </ScreenHeader>
    <HeroCard
      v-if="!loading && heroChallenge && !searching"
      :badge="t('discover.challengeBadge')"
      :title="heroChallenge.title"
      :description="heroChallenge.description"
      :progress="heroChallenge.progress"
      :filled="heroChallenge.stops.filter((stop) => stop.visited).length"
      :total="heroChallenge.stops.length"
      :note="heroChallenge.deadline"
      icon="i-ph-map-pin-area"
    />
    <div class="flex flex-col gap-8 pt-8">
      <div v-if="loading" class="flex flex-col gap-4" role="status" :aria-label="t('common.loading')">
        <USkeleton class="h-52 rounded-(--radius-card)" />
        <USkeleton class="h-64 rounded-(--radius-card)" />
      </div>

      <WalletProblem
        v-else-if="shopsState.status === 'error'"
        :message="t(`errors.${shopsState.error.code}`)"
        :action="t('common.retry')"
        @retry="reloadShops"
      />

      <p v-else-if="shops.length === 0" class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-toned">
        {{ t('discover.empty') }}
      </p>

      <template v-else>
        <section v-if="otherChallenges.length > 0 && !searching" class="flex flex-col gap-3" aria-labelledby="challenges-title">
          <h2 id="challenges-title" class="type-h2">
            {{ t('discover.challengesTitle', {}, otherChallenges.length) }}
          </h2>
          <ChallengeCard
            v-for="challenge in otherChallenges"
            :key="challenge.id"
            :challenge="challenge"
            :done-label="t('discover.challenge.done')"
          />
        </section>

        <section class="flex flex-col gap-3" aria-labelledby="fresh-title">
          <div class="flex flex-col gap-1">
            <h2 id="fresh-title" class="type-h2">
              {{ t('discover.freshTitle') }}
            </h2>
            <p v-if="fresh.length > 0" class="text-pretty text-toned">{{ t('discover.howTo') }}</p>
          </div>
          <ul v-if="fresh.length > 0" class="flex flex-col gap-4">
            <li v-for="(shop, index) in fresh" :key="shop.id" :style="{ '--i': index + 1 }" class="rise">
              <ShopCard :shop="shop" class="!animate-none" />
            </li>
          </ul>
          <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-pretty text-toned">
            {{ searching ? t('discover.noResults') : t('discover.freshEmpty') }}
          </p>
        </section>

        <section v-if="known.length > 0" class="flex flex-col gap-3" aria-labelledby="known-title">
          <h2 id="known-title" class="type-h2">
            {{ t('discover.knownTitle') }}
          </h2>
          <ul class="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none]">
            <li v-for="(shop, index) in known" :key="shop.id" :style="{ '--i': index + 1 }" class="rise shrink-0 snap-start">
              <ShopTile :shop="shop" to="/carteira" class="!animate-none" />
            </li>
          </ul>
          <UButton to="/carteira" variant="ghost" color="neutral" trailing-icon="i-ph-arrow-right" :label="t('discover.openWallet')" class="self-start" />
        </section>
      </template>
    </div>
  </div>
</template>
