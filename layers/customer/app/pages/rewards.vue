<script setup lang="ts">
definePageMeta({ path: '/premios', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const translate = useTranslate()
useHead({ title: () => `${t('rewards.title')} · ${t('app.name')}` })

const { signOut } = useCustomerSession()
const { state: cardsState, reload: reloadCards } = useWalletCards()
const { state: historyState, reload: reloadHistory } = useRewardHistory()

const groups = computed(() => (cardsState.value.status === 'success' ? groupRewards(cardsState.value.value) : undefined))
const ready = computed(() => groups.value?.ready.map((card) => toReadyRewardModel(card, translate, formatShortDate)) ?? [])
const upcoming = computed(() => groups.value?.upcoming.map((card) => toUpcomingRewardModel(card, translate)) ?? [])
const closest = computed(() => {
  const card = groups.value?.upcoming[0]
  return card ? closestRewardLine(card, translate) : null
})
const hasCards = computed(() => ready.value.length + upcoming.value.length > 0)

const history = computed(() => {
  if (historyState.value.status !== 'success') return []
  const now = new Date()
  return historyState.value.value.map((activity) => toLedgerEntryModel(activity, now, translate))
})

const unauthorized = computed(() =>
  [cardsState.value, historyState.value].some((state) => state.status === 'error' && state.error.code === 'unauthorized'),
)
watch(unauthorized, (value) => {
  if (value) void signOut()
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <h1 class="flex min-h-12 items-center text-[1.75rem] leading-[1.15] font-bold text-highlighted [font-stretch:90%]">
      {{ t('rewards.title') }}
    </h1>

    <div v-if="cardsState.status === 'loading'" class="flex flex-col gap-4" role="status" :aria-label="t('common.loading')">
      <div class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)">
        <div class="flex items-center gap-4">
          <USkeleton class="size-14 rounded-full" />
          <div class="flex flex-1 flex-col gap-2">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-6 w-2/3" />
          </div>
        </div>
        <USkeleton class="h-5 w-1/4" />
      </div>
      <USkeleton class="h-40 rounded-(--radius-card)" />
    </div>

    <WalletProblem
      v-else-if="cardsState.status === 'error'"
      :message="t(`errors.${cardsState.error.code}`)"
      :action="t('common.retry')"
      @retry="reloadCards"
    />

    <WalletEmpty
      v-else-if="!hasCards"
      :title="t('rewards.emptyTitle')"
      :lead="t('wallet.empty')"
      :action="t('wallet.emptyAction')"
      to="/descobrir"
    />

    <template v-else>
      <section class="flex flex-col gap-3" aria-labelledby="ready-title">
        <h2 id="ready-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
          {{ t('rewards.readyTitle') }}
        </h2>
        <ul v-if="ready.length > 0" class="flex flex-col gap-4">
          <li v-for="reward in ready" :key="reward.id">
            <RewardCoupon :reward="reward" :action="t('rewards.redeem')" />
          </li>
        </ul>
        <div
          v-else
          class="flex flex-col gap-1 rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4"
        >
          <p class="font-medium text-highlighted">{{ t('rewards.noneReady') }}</p>
          <p v-if="closest" class="text-pretty text-toned">{{ closest }}</p>
        </div>
      </section>

      <section v-if="upcoming.length > 0" class="flex flex-col gap-3" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
          {{ t('rewards.upcomingTitle') }}
        </h2>
        <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
          <RewardProgressList :rewards="upcoming" />
        </div>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="history-title">
        <h2 id="history-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
          {{ t('rewards.historyTitle') }}
        </h2>
        <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
          <USkeleton v-if="historyState.status === 'loading'" class="my-3 h-16" />
          <div v-else-if="historyState.status === 'error'" class="flex flex-wrap items-center justify-between gap-3 py-3">
            <p class="flex items-start gap-1.5 text-toned">
              <UIcon name="i-ph-wifi-slash" class="mt-1 size-4 shrink-0" aria-hidden="true" />
              {{ t(`errors.${historyState.error.code}`) }}
            </p>
            <UButton variant="outline" color="neutral" icon="i-ph-arrow-counter-clockwise" :label="t('common.retry')" @click="reloadHistory" />
          </div>
          <LedgerList v-else-if="history.length > 0" :entries="history" />
          <p v-else class="py-4 text-pretty text-muted">{{ t('rewards.historyEmpty') }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
