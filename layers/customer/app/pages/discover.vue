<script setup lang="ts">
import type { ShopSummary } from '#shared/schemas/shop'

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

const groups = computed(() => groupShops(shops.value, walletShopIds.value))
const challengeShopIds = computed(() => pendingChallengeShopIds(challenges.value))
const fresh = computed(() => groups.value.fresh.map((shop) => toShopTeaserModel(shop, challengeShopIds.value, translate)))
const known = computed(() => groups.value.known.map((shop) => toKnownShopModel(shop, translate)))
const challengeModels = computed(() => {
  const byId = new Map<string, ShopSummary>(shops.value.map((shop) => [shop.id, shop]))
  return challenges.value.map((challenge) => toChallengeModel(challenge, byId, translate, formatShortDate))
})

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
  <div class="flex flex-col gap-8">
    <PageTitle :title="t('discover.title')" :lead="t('discover.lead')" />

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
      <section v-if="challengeModels.length > 0" class="flex flex-col gap-3" aria-labelledby="challenges-title">
        <h2 id="challenges-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
          {{ t('discover.challengesTitle', {}, challengeModels.length) }}
        </h2>
        <ChallengeCard
          v-for="challenge in challengeModels"
          :key="challenge.id"
          :challenge="challenge"
          :done-label="t('discover.challenge.done')"
        />
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="fresh-title">
        <div class="flex flex-col gap-1">
          <h2 id="fresh-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
            {{ t('discover.freshTitle') }}
          </h2>
          <p v-if="fresh.length > 0" class="text-pretty text-toned">{{ t('discover.howTo') }}</p>
        </div>
        <ul v-if="fresh.length > 0" class="flex flex-col gap-4">
          <li v-for="shop in fresh" :key="shop.id">
            <ShopTeaserCard :shop="shop" />
          </li>
        </ul>
        <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-pretty text-toned">
          {{ t('discover.freshEmpty') }}
        </p>
      </section>

      <section v-if="known.length > 0" class="flex flex-col gap-3" aria-labelledby="known-title">
        <h2 id="known-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
          {{ t('discover.knownTitle') }}
        </h2>
        <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
          <KnownShopList :shops="known" />
        </div>
        <UButton to="/carteira" variant="ghost" color="neutral" trailing-icon="i-ph-arrow-right" :label="t('discover.openWallet')" class="self-start" />
      </section>
    </template>
  </div>
</template>
